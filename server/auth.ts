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
  CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
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
  CREATE INDEX IF NOT EXISTS idx_notif_user_all ON notifications(user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS dataset_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT,
    comment TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_ds ON dataset_comments(dataset_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_comments_user ON dataset_comments(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_dataset_access_user ON dataset_access(user_id);
  CREATE INDEX IF NOT EXISTS idx_dataset_access_ds ON dataset_access(dataset_id);
  CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_dataset_group_access_ds ON dataset_group_access(dataset_id);
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
// مستوى الصلاحية: view < edit < delete
export type Permission = "view" | "edit" | "delete";
const PERM_LEVEL: Record<Permission, number> = { view: 1, edit: 2, delete: 3 };

// حساب أعلى صلاحية للمستخدم على dataset (مباشرة + عبر مجموعاته)
export function getUserPermission(
  datasetId: number,
  userId: number,
  userRole: string
): Permission | null {
  if (process.env.LOCAL_AUTH !== "1") return "delete";
  if (userRole === "admin") return "delete";
  const ds = authDb
    .prepare("SELECT owner_id FROM datasets WHERE id = ?")
    .get(datasetId) as { owner_id: number | null } | undefined;
  if (!ds) return null;
  if (ds.owner_id === userId) return "delete";
  // مباشرة
  let best: Permission | null = null;
  const direct = authDb
    .prepare("SELECT permission FROM dataset_access WHERE dataset_id = ? AND user_id = ?")
    .get(datasetId, userId) as { permission?: string } | undefined;
  if (direct?.permission) best = (direct.permission as Permission);
  // عبر مجموعات
  const groupPerms = authDb
    .prepare(
      `SELECT dga.permission FROM dataset_group_access dga
       JOIN group_members gm ON gm.group_id = dga.group_id
       WHERE dga.dataset_id = ? AND gm.user_id = ?`
    )
    .all(datasetId, userId) as { permission: string }[];
  for (const g of groupPerms) {
    const p = g.permission as Permission;
    if (!best || PERM_LEVEL[p] > PERM_LEVEL[best]) best = p;
  }
  return best;
}

export function canAccessDataset(
  datasetId: number,
  userId: number,
  userRole: string
): boolean {
  return getUserPermission(datasetId, userId, userRole) !== null;
}

export function canEditDataset(
  datasetId: number,
  userId: number,
  userRole: string
): boolean {
  const p = getUserPermission(datasetId, userId, userRole);
  return p !== null && PERM_LEVEL[p] >= PERM_LEVEL.edit;
}

export function canDeleteDataset(
  datasetId: number,
  userId: number,
  userRole: string
): boolean {
  const p = getUserPermission(datasetId, userId, userRole);
  return p !== null && PERM_LEVEL[p] >= PERM_LEVEL.delete;
}

// جلب قائمة معرفات الـ datasets التي يستطيع المستخدم رؤيتها (مباشرة + مجموعات)
export function getAccessibleDatasetIds(
  userId: number,
  userRole: string
): number[] | "all" {
  if (process.env.LOCAL_AUTH !== "1") return "all";
  if (userRole === "admin") return "all";
  const owned = authDb
    .prepare("SELECT id FROM datasets WHERE owner_id = ?")
    .all(userId) as { id: number }[];
  const shared = authDb
    .prepare("SELECT dataset_id FROM dataset_access WHERE user_id = ?")
    .all(userId) as { dataset_id: number }[];
  const viaGroups = authDb
    .prepare(
      `SELECT DISTINCT dga.dataset_id FROM dataset_group_access dga
       JOIN group_members gm ON gm.group_id = dga.group_id
       WHERE gm.user_id = ?`
    )
    .all(userId) as { dataset_id: number }[];
  const ids = new Set<number>();
  owned.forEach((r) => ids.add(r.id));
  shared.forEach((r) => ids.add(r.dataset_id));
  viaGroups.forEach((r) => ids.add(r.dataset_id));
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


  // ═══ المجموعات (Groups) - admin فقط للإدارة ═══
  app.get("/api/groups", requireAuth, (_req, res) => {
    const rows = authDb.prepare(`SELECT g.*, (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count FROM groups g ORDER BY g.name`).all();
    res.json({ groups: rows });
  });
  app.post("/api/groups", requireAuth, (req: any, res) => {
    const cur = authDb.prepare("SELECT role, username FROM users WHERE id = ?").get(req.userId) as any;
    if (!cur || cur.role !== "admin") return res.status(403).json({ error: "يتطلب صلاحيات المسؤول" });
    const { name, description } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "اسم المجموعة مطلوب" });
    try {
      const r = authDb.prepare("INSERT INTO groups (name, description, created_by, created_at) VALUES (?, ?, ?, ?)").run(name.trim(), description || null, req.userId, Date.now());
      logAudit(req.userId, cur.username, "group_created", { targetType: "group", targetId: String(r.lastInsertRowid), details: { name }, ip: getClientIp(req) });
      res.json({ ok: true, id: r.lastInsertRowid });
    } catch (e: any) {
      if (e.message?.includes("UNIQUE")) return res.status(409).json({ error: "الاسم موجود مسبقاً" });
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/groups/:id", requireAuth, (req: any, res) => {
    const cur = authDb.prepare("SELECT role, username FROM users WHERE id = ?").get(req.userId) as any;
    if (!cur || cur.role !== "admin") return res.status(403).json({ error: "يتطلب صلاحيات المسؤول" });
    const id = parseInt(req.params.id, 10);
    const g = authDb.prepare("SELECT name FROM groups WHERE id = ?").get(id) as any;
    const tx = authDb.transaction(() => {
      authDb.prepare("DELETE FROM group_members WHERE group_id = ?").run(id);
      authDb.prepare("DELETE FROM dataset_group_access WHERE group_id = ?").run(id);
      authDb.prepare("DELETE FROM groups WHERE id = ?").run(id);
    });
    tx();
    logAudit(req.userId, cur.username, "group_deleted", { targetType: "group", targetId: String(id), details: { name: g?.name }, ip: getClientIp(req) });
    res.json({ ok: true });
  });
  app.get("/api/groups/:id/members", requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const rows = authDb.prepare(`SELECT u.id, u.username, u.role, CASE WHEN gm.user_id IS NOT NULL THEN 1 ELSE 0 END as is_member FROM users u LEFT JOIN group_members gm ON gm.user_id = u.id AND gm.group_id = ? ORDER BY u.username`).all(id);
    res.json({ users: rows });
  });
  app.post("/api/groups/:id/members", requireAuth, (req: any, res) => {
    const cur = authDb.prepare("SELECT role, username FROM users WHERE id = ?").get(req.userId) as any;
    if (!cur || cur.role !== "admin") return res.status(403).json({ error: "يتطلب صلاحيات المسؤول" });
    const gid = parseInt(req.params.id, 10);
    const { userIds } = req.body || {};
    if (!Array.isArray(userIds)) return res.status(400).json({ error: "userIds مطلوب" });
    const tx = authDb.transaction(() => {
      authDb.prepare("DELETE FROM group_members WHERE group_id = ?").run(gid);
      const ins = authDb.prepare("INSERT OR IGNORE INTO group_members (group_id, user_id, added_at) VALUES (?, ?, ?)");
      const now = Date.now();
      for (const u of userIds) { const n = parseInt(u, 10); if (!isNaN(n)) ins.run(gid, n, now); }
    });
    tx();
    logAudit(req.userId, cur.username, "group_members_updated", { targetType: "group", targetId: String(gid), details: { userIds }, ip: getClientIp(req) });
    res.json({ ok: true });
  });

  // ═══ صلاحية مجموعة على dataset ═══
  app.get("/api/datasets/:id/group-access", requireAuth, (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    const ds = authDb.prepare("SELECT owner_id FROM datasets WHERE id = ?").get(id) as any;
    if (!ds) return res.status(404).json({ error: "غير موجود" });
    if (req.userRole !== "admin" && ds.owner_id !== req.userId) return res.status(403).json({ error: "غير مسموح" });
    const rows = authDb.prepare(`SELECT g.id, g.name, g.description, dga.permission, (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count FROM groups g LEFT JOIN dataset_group_access dga ON dga.group_id = g.id AND dga.dataset_id = ? ORDER BY g.name`).all(id);
    res.json({ groups: rows });
  });
  app.post("/api/datasets/:id/group-access", requireAuth, (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    const ds = authDb.prepare("SELECT owner_id, name FROM datasets WHERE id = ?").get(id) as any;
    if (!ds) return res.status(404).json({ error: "غير موجود" });
    if (req.userRole !== "admin" && ds.owner_id !== req.userId) return res.status(403).json({ error: "غير مسموح" });
    const { groups } = req.body || {};
    if (!Array.isArray(groups)) return res.status(400).json({ error: "groups مطلوب" });
    const tx = authDb.transaction(() => {
      authDb.prepare("DELETE FROM dataset_group_access WHERE dataset_id = ?").run(id);
      const ins = authDb.prepare("INSERT INTO dataset_group_access (dataset_id, group_id, permission, granted_at) VALUES (?, ?, ?, ?)");
      const now = Date.now();
      for (const g of groups) {
        const gid = parseInt(g.id, 10);
        const perm = ["view","edit","delete"].includes(g.permission) ? g.permission : "view";
        if (!isNaN(gid)) ins.run(id, gid, perm, now);
      }
    });
    tx();
    try {
      const u = authDb.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
      for (const g of groups) {
        const members = authDb.prepare("SELECT user_id FROM group_members WHERE group_id = ?").all(parseInt(g.id, 10)) as { user_id: number }[];
        for (const m of members) {
          if (m.user_id !== ds.owner_id && m.user_id !== req.userId) {
            notify(m.user_id, "share", "تمت مشاركة ملف مع مجموعتك", `تمت مشاركة "${ds.name}" مع مجموعتك بواسطة ${u?.username || "النظام"}`, `#/datasets/${id}`);
          }
        }
      }
      logAudit(req.userId, u?.username || null, "group_access_updated", { targetType: "dataset", targetId: String(id), details: { groups }, ip: getClientIp(req) });
    } catch {}
    res.json({ ok: true });
  });

  // ═══ تحديث صلاحية مستخدم مباشرة ═══
  app.patch("/api/datasets/:id/access/:userId", requireAuth, (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    const ds = authDb.prepare("SELECT owner_id FROM datasets WHERE id = ?").get(id) as any;
    if (!ds) return res.status(404).json({ error: "غير موجود" });
    if (req.userRole !== "admin" && ds.owner_id !== req.userId) return res.status(403).json({ error: "غير مسموح" });
    const { permission } = req.body || {};
    if (!["view","edit","delete"].includes(permission)) return res.status(400).json({ error: "مستوى صلاحية غير صحيح" });
    authDb.prepare("UPDATE dataset_access SET permission = ? WHERE dataset_id = ? AND user_id = ?").run(permission, id, targetUserId);
    res.json({ ok: true });
  });

  // ═══ التعليقات على الـ datasets ═══
  app.get("/api/datasets/:id/comments", requireAuth, (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    if (!canAccessDataset(id, req.userId, req.userRole)) return res.status(403).json({ error: "غير مسموح" });
    const rows = authDb.prepare("SELECT * FROM dataset_comments WHERE dataset_id = ? ORDER BY id DESC LIMIT 200").all(id);
    res.json({ comments: rows });
  });
  app.post("/api/datasets/:id/comments", requireAuth, (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    if (!canAccessDataset(id, req.userId, req.userRole)) return res.status(403).json({ error: "غير مسموح" });
    const { comment } = req.body || {};
    if (!comment || !comment.trim()) return res.status(400).json({ error: "التعليق مطلوب" });
    const u = authDb.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
    const r = authDb.prepare("INSERT INTO dataset_comments (dataset_id, user_id, username, comment, created_at) VALUES (?, ?, ?, ?, ?)").run(id, req.userId, u?.username || null, comment.trim(), Date.now());
    try {
      const ds = authDb.prepare("SELECT owner_id, name FROM datasets WHERE id = ?").get(id) as any;
      const sharedUsers = authDb.prepare("SELECT user_id FROM dataset_access WHERE dataset_id = ?").all(id) as { user_id: number }[];
      const recipients = new Set<number>();
      if (ds?.owner_id && ds.owner_id !== req.userId) recipients.add(ds.owner_id);
      sharedUsers.forEach((s) => { if (s.user_id !== req.userId) recipients.add(s.user_id); });
      for (const rid of recipients) notify(rid, "comment", "تعليق جديد", `${u?.username || "مستخدم"} أضاف تعليقاً على "${ds?.name}"`, `#/datasets/${id}`);
    } catch {}
    res.json({ ok: true, id: r.lastInsertRowid });
  });
  app.delete("/api/comments/:id", requireAuth, (req: any, res) => {
    const cid = parseInt(req.params.id, 10);
    const c = authDb.prepare("SELECT user_id FROM dataset_comments WHERE id = ?").get(cid) as any;
    if (!c) return res.status(404).json({ error: "غير موجود" });
    if (c.user_id !== req.userId && req.userRole !== "admin") return res.status(403).json({ error: "غير مسموح" });
    authDb.prepare("DELETE FROM dataset_comments WHERE id = ?").run(cid);
    res.json({ ok: true });
  });

  // ═══ سؤال الأمان + نسيت كلمة المرور ═══
  app.post("/api/auth/security-question", requireAuth, (req: any, res) => {
    const { question, answer } = req.body || {};
    if (!question || !answer || answer.length < 3) return res.status(400).json({ error: "السؤال والإجابة مطلوبان" });
    const salt = makeSalt();
    const answerHash = hashPassword(answer.toLowerCase().trim(), salt);
    authDb.prepare("INSERT OR REPLACE INTO security_questions (user_id, question, answer_hash, salt) VALUES (?, ?, ?, ?)").run(req.userId, question, answerHash, salt);
    res.json({ ok: true });
  });
  app.get("/api/auth/security-question", requireAuth, (req: any, res) => {
    const sq = authDb.prepare("SELECT question FROM security_questions WHERE user_id = ?").get(req.userId) as any;
    res.json({ question: sq?.question || null });
  });
  app.post("/api/auth/forgot/lookup", (req, res) => {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: "اسم المستخدم مطلوب" });
    const u = authDb.prepare("SELECT id FROM users WHERE username = ?").get(username) as any;
    if (!u) return res.status(404).json({ error: "لا يوجد سؤال أمان لهذا المستخدم" });
    const sq = authDb.prepare("SELECT question FROM security_questions WHERE user_id = ?").get(u.id) as any;
    if (!sq) return res.status(404).json({ error: "لا يوجد سؤال أمان لهذا المستخدم" });
    res.json({ question: sq.question });
  });
  app.post("/api/auth/forgot/reset", (req, res) => {
    const { username, answer, newPassword } = req.body || {};
    if (!username || !answer || !newPassword || newPassword.length < 6) return res.status(400).json({ error: "البيانات ناقصة أو كلمة المرور أقل من 6 أحرف" });
    const u = authDb.prepare("SELECT id, username FROM users WHERE username = ?").get(username) as any;
    if (!u) return res.status(401).json({ error: "غير صحيح" });
    const sq = authDb.prepare("SELECT answer_hash, salt FROM security_questions WHERE user_id = ?").get(u.id) as any;
    if (!sq) return res.status(404).json({ error: "لا يوجد سؤال أمان" });
    const hash = hashPassword(String(answer).toLowerCase().trim(), sq.salt);
    if (hash !== sq.answer_hash) {
      logAudit(u.id, u.username, "password_reset_failed", { ip: getClientIp(req) });
      return res.status(401).json({ error: "الإجابة غير صحيحة" });
    }
    const newSalt = makeSalt();
    const newHash = hashPassword(newPassword, newSalt);
    authDb.prepare("UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0 WHERE id = ?").run(newHash, newSalt, u.id);
    authDb.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
    logAudit(u.id, u.username, "password_reset", { ip: getClientIp(req) });
    res.json({ ok: true });
  });

  // ═══ نسخة احتياطية JSON (admin) ═══
  app.get("/api/backup", requireAuth, (req: any, res) => {
    const cur = authDb.prepare("SELECT role, username FROM users WHERE id = ?").get(req.userId) as any;
    if (!cur || cur.role !== "admin") return res.status(403).json({ error: "يتطلب صلاحيات المسؤول" });
    try {
      const tables = ["users","sessions","datasets","dataset_access","groups","group_members","dataset_group_access","audit_log","notifications","dataset_comments","security_questions"];
      const backup: any = { version: 1, exported_at: Date.now(), tables: {} };
      for (const t of tables) {
        try { backup.tables[t] = authDb.prepare(`SELECT * FROM ${t}`).all(); } catch { backup.tables[t] = []; }
      }
      logAudit(req.userId, cur.username, "backup_exported", { ip: getClientIp(req) });
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="qiyasat-backup-${new Date().toISOString().slice(0,10)}.json"`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
