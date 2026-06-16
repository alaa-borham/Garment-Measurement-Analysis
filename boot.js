// نقطة بداية ذكية تعمل في وضعين:
// 1) محلي (Windows / macOS): تنسخ better-sqlite3 binary المناسب وتفتح المتصفح تلقائيًا
// 2) سيرفر إنتاج (Render / Railway / Linux): تستمع على 0.0.0.0 والمنفذ من البيئة
const fs = require("fs");
const path = require("path");
const os = require("os");

const platform = os.platform(); // 'win32', 'darwin', 'linux'
const arch = os.arch(); // 'x64', 'arm64'
const key = `${platform}-${arch}`;

// كشف بيئة الإنتاج: Render يضع RENDER=true تلقائيًا، أو نعتمد على NODE_ENV
const IS_PRODUCTION_SERVER =
  process.env.RENDER === "true" ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.FLY_APP_NAME ||
  process.env.NODE_ENV === "production_server" ||
  platform === "linux";

const SRC = path.join(__dirname, "prebuilds", key, "better_sqlite3.node");
const DST_DIR = path.join(
  __dirname,
  "node_modules",
  "better-sqlite3",
  "build",
  "Release"
);
const DST = path.join(DST_DIR, "better_sqlite3.node");

console.log("════════════════════════════════════════════");
console.log("  قياسات - نظام إدارة وتحليل القياسات");
console.log("════════════════════════════════════════════");
console.log(`نظام التشغيل: ${platform} (${arch})`);
console.log(`الوضع: ${IS_PRODUCTION_SERVER ? "إنتاج (سيرفر)" : "محلي"}`);

// على Linux/Render، better-sqlite3 يُبنى من npm install تلقائيًا (لا نحتاج نسخ prebuild يدويًا)
if (!IS_PRODUCTION_SERVER) {
  if (!fs.existsSync(SRC)) {
    console.error("");
    console.error(`[خطأ] هذا النظام (${key}) غير مدعوم في النسخة المحلية.`);
    console.error("الأنظمة المدعومة محليًا: Windows x64, macOS x64, macOS arm64");
    process.exit(1);
  }

  fs.mkdirSync(DST_DIR, { recursive: true });
  const srcStat = fs.statSync(SRC);
  let needCopy = true;
  if (fs.existsSync(DST)) {
    const dstStat = fs.statSync(DST);
    if (dstStat.size === srcStat.size) needCopy = false;
  }
  if (needCopy) {
    fs.copyFileSync(SRC, DST);
    console.log("✓ تم تحضير المكتبة الأصلية");
  }
}

// مسار قاعدة البيانات
// - محليًا: مجلد بيانات المستخدم في النظام
// - على Render: قرص دائم على /var/data (نضبطه في render.yaml)
let userDataDir;
if (IS_PRODUCTION_SERVER) {
  userDataDir = process.env.DATA_DIR || "/var/data";
} else {
  userDataDir =
    platform === "win32"
      ? path.join(process.env.APPDATA || os.homedir(), "Qiyasat")
      : platform === "darwin"
      ? path.join(os.homedir(), "Library", "Application Support", "Qiyasat")
      : path.join(os.homedir(), ".qiyasat");
}

try {
  fs.mkdirSync(userDataDir, { recursive: true });
} catch (e) {
  console.error(`[تحذير] تعذّر إنشاء مجلد البيانات: ${userDataDir}`);
  console.error(e.message);
}
// في الإنتاج، الخادم ينشئ data.db في cwd؛ لذا نوجّه AUTH_DB_PATH لـ data.db (نسبي)
// بعد تغيير cwd إلى userDataDir، ستصبح كلتا القاعدتين في نفس الملف
const dbPath = IS_PRODUCTION_SERVER
  ? path.join(userDataDir, "data.db")
  : path.join(userDataDir, "qiyasat.db");

// ضبط متغيرات البيئة للخادم
process.env.NODE_ENV = "production";
process.env.LOCAL_AUTH = "1";
process.env.AUTH_DB_PATH = dbPath;

if (IS_PRODUCTION_SERVER) {
  // على السيرفر: استمع على كل الواجهات والمنفذ من البيئة
  process.env.HOST = "0.0.0.0";
  process.env.PORT = process.env.PORT || "10000";
  console.log(`مجلد البيانات (دائم): ${userDataDir}`);
  console.log(`HOST: ${process.env.HOST}  PORT: ${process.env.PORT}`);

  // الخادم المُجمَّع ينشئ data.db في مجلد العمل الحالي،
  // لذلك نغيّر cwd إلى القرص الدائم قبل تشغيله — وإلا ستُمسح البيانات عند كل نشر
  try {
    process.chdir(userDataDir);
    console.log(`✓ مجلد العمل: ${process.cwd()}`);
  } catch (e) {
    console.error(`[تحذير] تعذّر تغيير مجلد العمل إلى ${userDataDir}: ${e.message}`);
  }

  console.log("جارٍ تشغيل الخادم...");
  console.log("");
  // شغّل الخادم مباشرة (بدون فتح متصفح أو البحث عن منفذ بديل)
  // ملاحظة: استخدم المسار المطلق لأن cwd قد تغيّر
  require(path.join(__dirname, "dist", "server.cjs"));
} else {
  // محليًا: ابحث عن منفذ متاح وافتح المتصفح
  process.env.HOST = "127.0.0.1";
  const net = require("net");
  function findFreePort(start, attempts = 10) {
    return new Promise((resolve, reject) => {
      const tryPort = (port) => {
        if (port > start + attempts) {
          return reject(new Error("لا توجد منافذ متاحة"));
        }
        const srv = net.createServer();
        srv.once("error", () => tryPort(port + 1));
        srv.once("listening", () => {
          srv.close(() => resolve(port));
        });
        srv.listen(port, "127.0.0.1");
      };
      tryPort(start);
    });
  }

  const preferredPort = parseInt(process.env.PORT || "5173", 10);
  console.log(`مجلد البيانات: ${userDataDir}`);
  console.log("");

  (async () => {
    let port;
    try {
      port = await findFreePort(preferredPort);
    } catch (e) {
      console.error("[خطأ] لم نجد منفذاً متاحاً");
      process.exit(1);
    }
    process.env.PORT = String(port);
    if (port !== preferredPort) {
      console.log(`المنفذ ${preferredPort} مستخدم — سنستخدم ${port} بدلاً منه`);
    }
    console.log("جارٍ تشغيل الخادم...");
    console.log(`افتح المتصفح على: http://localhost:${port}`);
    console.log("لإيقاف البرنامج: أغلق هذه النافذة");
    console.log("");

    setTimeout(() => {
      const url = `http://localhost:${port}`;
      const { exec } = require("child_process");
      const cmd =
        platform === "win32"
          ? `start "" "${url}"`
          : platform === "darwin"
          ? `open "${url}"`
          : `xdg-open "${url}"`;
      exec(cmd, () => {});
    }, 2000);

    require("./dist/server.cjs");
  })();
}
