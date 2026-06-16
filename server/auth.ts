// نظام تسجيل الدخول المحلي (يعمل فقط عند ضبط LOCAL_AUTH=1)
import type { Express, Request, Response, NextFunction } from "express";
import Database from "better-sqlite3";
import crypto from "node:crypto";
import path from "node:path";

// السماح بمسار قاعدة بيانات منفصل لمنع التداخل
const AUTH_DB_PATH = process.env.AUTH_DB_PATH || "data.db";
const authDb = new Database(AUTH_DB_PATH);
authDb.pragma("journal_mode = WAL");

authDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dataset_access (
    dataset_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    permission TEXT NOT NULL DEFAULT 'view',
    granted_at INTEGER NOT NULL,
    PRIMARY KEY (dataset_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    target_name TEXT,
    details TEXT,
    ip TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_by INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (group_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS dataset_group_access (
    dataset_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    permission TEXT NOT NULL DEFAULT 'view',
    granted_at INTEGER NOT NULL,
    PRIMARY KEY (dataset_id, group_id)
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at DESC);
  CREATE TABLE IF NOT EXISTS dataset_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT,
    comment TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_ds ON dataset_comments(dataset_id, created_at);
  CREATE TABLE IF NOT EXISTS security_questions (
    user_id INTEGER PRIMARY KEY,
    question TEXT NOT NULL,
    answer_hash TEXT NOT NULL,
    salt TEXT NOT NULL
  );
`);

// Migration: إضافة أعمدة جديدة للجداول الموجودة
try {
  const userCols = authDb.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some((c) => c.name === "must_change_password")) {
    authDb.exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0");
  }
  if (!userCols.some((c) => c.name === "last_login")) {
    authDb.exec("ALTER TABLE users ADD COLUMN last_login INTEGER");
  }
  const accessCols = authDb.prepare("PRAGMA table_info(dataset_access)").all() as { name: string }[];
  if (accessCols.length > 0 && !accessCols.some((c) => c.name === "permission")) {
    authDb.exec("ALTER TABLE dataset_access ADD COLUMN permission TEXT NOT NULL DEFAULT 'view'");
  }
} catch (e) {
  console.error("[migration] users/access error:", e);
}

// Migration: إضافة owner_id لجدول datasets إن لم يكن موجوداً
try {
  const cols = authDb
    .prepare("PRAGMA table_info(datasets)")
    .all() as { name: string }[];
  if (cols.length > 0 && !cols.some((c) => c.name === "owner_id")) {
    authDb.exec("ALTER TABLE datasets ADD COLUMN owner_id INTEGER");
    // ربط البيانات الموجودة بأول admin
    const firstAdmin = authDb
      .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")
      .get() as { id: number } | undefined;
    if (firstAdmin) {
      authDb
        .prepare("UPDATE datasets SET owner_id = ? WHERE owner_id IS NULL")
        .run(firstAdmin.id);
    }
    console.log("[migration] owner_id column added to datasets");
  }
} catch (e) {
  // الجدول قد لا يكون موجوداً بعد - ستتم الإضافة في storage init
}

function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
}

function makeSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function makeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// إنشاء حساب افتراضي عند أول تشغيل
function ensureDefaultUser() {
  const count = authDb
    .prepare("SELECT COUNT(*) as c FROM users")
    .get() as { c: number };
  if (count.c === 0) {
    const salt = makeSalt();
    const password = process.env.DEFAULT_PASSWORD || "admin123";
    const hash = hashPassword(password, salt);
    authDb
      .prepare(
        "INSERT INTO users (username, password_hash, salt, role, created_at, must_change_password) VALUES (?, ?, ?, ?, ?, 1)"
      )
      .run("admin", hash, salt, "admin", Date.now());
    console.log("");
    console.log("════════════════════════════════════════════");
    console.log("  تم إنشاء الحساب الافتراضي:");
    console.log("  اسم المستخدم: admin");
    console.log(`  كلمة المرور: ${password}`);
    console.log("  (يمكن تغييرها لاحقاً من شاشة الإعدادات)");
    console.log("════════════════════════════════════════════");
    console.log("");
  }
}

interface User {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  role: string;
}

interface Session {
  token: string;
  user_id: number;
  expires_at: number;
}

// التحقق من الجلسة
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // إذا لم يكن وضع المصادقة مفعّل، تخطّى
  if (process.env.LOCAL_AUTH !== "1") {
    return next();
  }
  const token =
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    (req.headers.cookie?.match(/qiyasat_token=([^;]+)/)?.[1] ?? "");
  if (!token) {
    return res.status(401).json({ error: "غير مصرّح" });
  }
  const session = authDb
    .prepare("SELECT * FROM sessions WHERE token = ?")
    .get(token) as Session | undefined;
  if (!session || session.expires_at < Date.now()) {
    return res.status(401).json({ error: "انتهت الجلسة" });
  }
  (req as any).userId = session.user_id;
  // جلب role وحفظه في الـ request
  const userRow = authDb
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(session.user_id) as { role: string } | undefined;
  (req as any).userRole = userRow?.role || "user";
  next();
}

// التحقق من صلاحية الوصول إلى dataset
export function canAccessDataset(
  datasetId: number,
  userId: number,
  userRole: string
): boolean {
  // إذا المصادقة معطلة، اسمح بكل شيء
  if (process.env.LOCAL_AUTH !== "1") return true;
  
  // الأدمن يصل لكل شيء
  if (userRole === "admin") return true;
  
  // جلب صاحب الـ dataset
  const ds = authDb
    .prepare("SELECT owner_id FROM datasets WHERE id = ?")
    .get(datasetId) as { owner_id: number | null } | undefined;
  
  if (!ds) return false; // dataset غير موجود
  
  // المالك له الصلاحية دائماً
  if (ds.owner_id === userId) return true;
  
  // تحقق من جدول المشاركة
  const access = authDb
    .prepare(
      "SELECT 1 FROM dataset_access WHERE dataset_id = ? AND user_id = ?"
    )
    .get(datasetId, userId);
  return !!access;
}

// جلب قائمة معرفات الـ datasets التي يستطيع المستخدم رؤيتها
export function getAccessibleDatasetIds(
  userId: number,
  userRole: string
): number[] | "all" {
  if (process.env.LOCAL_AUTH !== "1") return "all";
  
  // الأدمن يرى كل شيء
  // (نعم - الأدمن يرى كل البيانات حتى التي رفعها مستخدمون آخرون)
  if (userRole === "admin") return "all";
  
  // المستخدم العادي: بياناته + المُشارَكة معه
  const owned = authDb
    .prepare("SELECT id FROM datasets WHERE owner_id = ?")
    .all(userId) as { id: number }[];
  const shared = authDb
    .prepare("SELECT dataset_id FROM dataset_access WHERE user_id = ?")
    .all(userId) as { dataset_id: number }[];
  
  const ids = new Set<number>();
  owned.forEach((r) => ids.add(r.id));
  shared.forEach((r) => ids.add(r.dataset_id));
  return Array.from(ids);
}

// تصدير authDb للاستخدام في routes
export { authDb };

// ═════════════════════════════════════════════════════════════
// Helpers: Audit Log + Notifications + Client IP
// ═════════════════════════════════════════════════════════════
export function getClientIp(req: any): string {
  const xfwd = req.headers?.["x-forwarded-for"];
  if (typeof xfwd === "string" && xfwd.length > 0) return xfwd.split(",")[0].trim();
  return req.socket?.remoteAddress || req.ip || "";
}

export function logAudit(
  userId: number | null,
  username: string | null,
  action: string,
  opts?: { targetType?: string; targetId?: string; details?: any; ip?: string }
) {
  try {
    authDb
      .prepare(
        "INSERT INTO audit_log (user_id, username, action, target_type, target_id, details, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        userId,
        username,
        action,
        opts?.targetType || null,
        opts?.targetId || null,
        opts?.details ? JSON.stringify(opts.details) : null,
        opts?.ip || null,
        Date.now()
      );
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}

export function notify(
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    authDb
      .prepare(
        "INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)"
      )
      .run(userId, type, title, message, link || null, Date.now());
  } catch (e) {
    console.error("[notify] failed:", e);
  }
}

export function getUserById(userId: number): User | undefined {
  return authDb
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as User | undefined;
}

export function registerAuthRoutes(app: Express) {
  if (process.env.LOCAL_AUTH !== "1") return;
  ensureDefaultUser();

  // تسجيل دخول
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
    }
    const user = authDb
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as User | undefined;
    if (!user) {
      logAudit(null, username, "login_failed", { ip: getClientIp(req), details: { reason: "user_not_found" } });
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }
    const hash = hashPassword(password, user.salt);
    if (hash !== user.password_hash) {
      logAudit(user.id, user.username, "login_failed", { ip: getClientIp(req), details: { reason: "bad_password" } });
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }
    const token = makeToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    authDb
      .prepare(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
      )
      .run(token, user.id, Date.now(), expiresAt);
    try { authDb.prepare("UPDATE users SET last_login = ? WHERE id = ?").run(Date.now(), user.id); } catch {}
    logAudit(user.id, user.username, "login", { ip: getClientIp(req) });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: !!(user as any).must_change_password,
      },
    });
  });

  // تسجيل خروج
  app.post("/api/auth/logout", (req, res) => {
    const token =
      req.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
    if (token) {
      try {
        const sess = authDb.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as { user_id: number } | undefined;
        if (sess) {
          const u = getUserById(sess.user_id);
          logAudit(sess.user_id, u?.username || null, "logout", { ip: getClientIp(req) });
        }
      } catch {}
      authDb.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }
    res.json({ ok: true });
  });

  // التحقق من المستخدم الحالي
  app.get("/api/auth/me", (req, res) => {
    const token =
      req.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
    if (!token) return res.status(401).json({ error: "غير مصرّح" });
    const session = authDb
      .prepare("SELECT * FROM sessions WHERE token = ?")
      .get(token) as Session | undefined;
    if (!session || session.expires_at < Date.now()) {
      return res.status(401).json({ error: "انتهت الجلسة" });
    }
    const user = authDb
      .prepare("SELECT id, username, role, must_change_password, last_login FROM users WHERE id = ?")
      .get(session.user_id) as any;
    if (!user) return res.status(401).json({ error: "غير موجود" });
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: !!user.must_change_password,
        lastLogin: user.last_login,
      },
    });
  });

  // تغيير كلمة المرور
  app.post("/api/auth/change-password", requireAuth, (req, res) => {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 4) {
      return res
        .status(400)
        .json({ error: "كلمة المرور الجديدة قصيرة (4 أحرف على الأقل)" });
    }
    const user = authDb
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as User | undefined;
    if (!user) return res.status(404).json({ error: "غير موجود" });
    const hash = hashPassword(currentPassword, user.salt);
    if (hash !== user.password_hash) {
      return res
        .status(401)
        .json({ error: "كلمة المرور الحالية غير صحيحة" });
    }
    const newSalt = makeSalt();
    const newHash = hashPassword(newPassword, newSalt);
    authDb
      .prepare(
        "UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0 WHERE id = ?"
      )
      .run(newHash, newSalt, userId);
    logAudit(userId, user.username, "password_changed", { ip: getClientIp(req) });
    res.json({ ok: true });
  });

  // ═══ سجل العمليات (Audit Log) - admin فقط ═══
  app.get("/api/audit-log", requireAuth, (req, res) => {
    const uid = (req as any).userId;
    const cur = authDb.prepare("SELECT role FROM users WHERE id = ?").get(uid) as { role: string } | undefined;
    if (!cur || cur.role !== "admin") return res.status(403).json({ error: "يتطلب صلاحيات المسؤول" });
    const limit = Math.min(parseInt((req.query.limit as string) || "200", 10) || 200, 1000);
    const rows = authDb.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?").all(limit);
    res.json({ entries: rows });
  });

  // ═══ الإشعارات ═══
  app.get("/api/notifications", requireAuth, (req, res) => {
    const uid = (req as any).userId;
    const rows = authDb.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100").all(uid);
    const unread = (authDb.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0").get(uid) as { c: number }).c;
    res.json({ notifications: rows, unread });
  });
  app.patch("/api/notifications/:id/read", requireAuth, (req, res) => {
    const uid = (req as any).userId;
    const id = parseInt(req.params.id, 10);
    authDb.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(id, uid);
    res.json({ ok: true });
  });
  app.patch("/api/notifications/read-all", requireAuth, (req, res) => {
    const uid = (req as any).userId;
    authDb.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(uid);
    res.json({ ok: true });
  });
  app.delete("/api/notifications/:id", requireAuth, (req, res) => {
    const uid = (req as any).userId;
    const id = parseInt(req.params.id, 10);
    authDb.prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?").run(id, uid);
    res.json({ ok: true });
  });

  // فحص حالة المصادقة (هل مفعّلة)
  app.get("/api/auth/status", (_req, res) => {
    res.json({ enabled: true });
  });
  // ═════════════════════════════════════════════════════════════
  // إدارة المستخدمين (Admin فقط)
  // ═════════════════════════════════════════════════════════════

  // Middleware: التأكد أن المستخدم admin
  function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const userId = (req as any).userId;
    const user = authDb
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as { role: string } | undefined;
    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "يتطلب هذا الإجراء صلاحيات المسؤول" });
    }
    next();
  }

  // عرض كل المستخدمين (admin فقط)
  app.get("/api/auth/users", requireAuth, requireAdmin, (_req, res) => {
    const users = authDb
      .prepare(
        "SELECT id, username, role, created_at FROM users ORDER BY id ASC"
      )
      .all();
    res.json({ users });
  });

  // إنشاء مستخدم جديد (admin فقط)
  app.post("/api/auth/users", requireAuth, requireAdmin, (req, res) => {
    const { username, password, role } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
    }
    if (password.length < 4) {
      return res
        .status(400)
        .json({ error: "كلمة المرور قصيرة (4 أحرف على الأقل)" });
    }
    const validRoles = ["admin", "editor", "viewer", "user"];
    const userRole = validRoles.includes(role) ? role : "user";
    const existing = authDb
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (existing) {
      return res.status(409).json({ error: "اسم المستخدم موجود مسبقاً" });
    }
    const salt = makeSalt();
    const hash = hashPassword(password, salt);
    const result = authDb
      .prepare(
        "INSERT INTO users (username, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(username, hash, salt, userRole, Date.now());
    res.json({
      ok: true,
      user: {
        id: result.lastInsertRowid,
        username,
        role: userRole,
      },
    });
  });

  // تعديل دور مستخدم (admin فقط)
  app.patch(
    "/api/auth/users/:id/role",
    requireAuth,
    requireAdmin,
    (req, res) => {
      const id = parseInt(req.params.id, 10);
      const { role } = req.body || {};
      const validRoles = ["admin", "editor", "viewer", "user"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "دور غير صحيح" });
      }
      const user = authDb
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(id) as User | undefined;
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
      if (user.role === "admin" && role !== "admin") {
        const adminCount = authDb
          .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'")
          .get() as { c: number };
        if (adminCount.c <= 1) {
          return res
            .status(400)
            .json({ error: "لا يمكن إزالة آخر مسؤول في النظام" });
        }
      }
      authDb
        .prepare("UPDATE users SET role = ? WHERE id = ?")
        .run(role, id);
      res.json({ ok: true });
    }
  );

  // إعادة تعيين كلمة مرور مستخدم (admin فقط)
  app.patch(
    "/api/auth/users/:id/password",
    requireAuth,
    requireAdmin,
    (req, res) => {
      const id = parseInt(req.params.id, 10);
      const { newPassword } = req.body || {};
      if (!newPassword || newPassword.length < 4) {
        return res
          .status(400)
          .json({ error: "كلمة المرور قصيرة (4 أحرف على الأقل)" });
      }
      const user = authDb
        .prepare("SELECT id FROM users WHERE id = ?")
        .get(id);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
      const newSalt = makeSalt();
      const newHash = hashPassword(newPassword, newSalt);
      authDb
        .prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?")
        .run(newHash, newSalt, id);
      authDb.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
      res.json({ ok: true });
    }
  );

  // حذف مستخدم (admin فقط)
  app.delete(
    "/api/auth/users/:id",
    requireAuth,
    requireAdmin,
    (req, res) => {
      const id = parseInt(req.params.id, 10);
      const currentUserId = (req as any).userId;
      if (id === currentUserId) {
        return res
          .status(400)
          .json({ error: "لا يمكنك حذف حسابك الحالي" });
      }
      const user = authDb
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(id) as User | undefined;
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
      if (user.role === "admin") {
        const adminCount = authDb
          .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'")
          .get() as { c: number };
        if (adminCount.c <= 1) {
          return res
            .status(400)
            .json({ error: "لا يمكن حذف آخر مسؤول في النظام" });
        }
      }
      authDb.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
      authDb.prepare("DELETE FROM users WHERE id = ?").run(id);
      res.json({ ok: true });
    }
  );
}

// نقطة دخول عامة لمعرفة هل المصادقة مفعّلة (تعمل حتى لو LOCAL_AUTH=0)
export function registerAuthStatus(app: Express) {
  app.get("/api/auth/status", (_req, res) => {
    res.json({ enabled: process.env.LOCAL_AUTH === "1" });
  });
}
