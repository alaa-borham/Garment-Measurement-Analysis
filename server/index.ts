import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "node:http";

const app = express();
const httpServer = createServer(app);

// تفعيل ضغط Gzip لتسريع نقل البيانات (خاصة في Electron)
app.use(compression({
  level: 6,
  threshold: 1024, // ضغط فقط ما هو أكبر من 1KB
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// تسجيل خفيف (بدون JSON.stringify لكل response) — أسرع بكثير
const VERBOSE_LOG = process.env.QIYASAT_VERBOSE_LOG === "1";
app.use((req, res, next) => {
  if (!VERBOSE_LOG) return next();
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });
  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // دعم ويندوز: reusePort غير مدعوم على Windows
  const isWindows = process.platform === "win32";
  const host = process.env.HOST || (isWindows ? "127.0.0.1" : "0.0.0.0");
  const listenOpts: any = { port, host };
  if (!isWindows && process.env.LOCAL_AUTH !== "1") {
    listenOpts.reusePort = true;
  }
  httpServer.listen(listenOpts, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
