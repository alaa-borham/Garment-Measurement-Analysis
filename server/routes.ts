import type { Express, Request } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { filterRequestSchema, pivotRequestSchema, chartRequestSchema } from "@shared/schema";
import { z } from "zod";
import { duplicatePreviewSchema, duplicateDeleteSchema } from "../shared/duplicates";
import { previewDuplicates, deleteDuplicateCopies } from "./duplicates";
import {
  registerAuthRoutes,
  requireAuth,
  canAccessDataset,
  canEditDataset,
  canDeleteDataset,
  getAccessibleDatasetIds,
  getUserPermission,
  authDb,
  logAudit,
  notify,
  getClientIp,
  requireFeature,
} from "./auth";

// Middleware: requires edit-level on dataset
function requireDatasetEdit(req: any, res: any, next: any) {
  if (process.env.LOCAL_AUTH !== "1") return next();
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });
  if (!canEditDataset(id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "تحتاج صلاحية تعديل" });
  }
  next();
}
function requireDatasetDelete(req: any, res: any, next: any) {
  if (process.env.LOCAL_AUTH !== "1") return next();
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });
  if (!canDeleteDataset(id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "تحتاج صلاحية حذف" });
  }
  next();
}

// Middleware: التحقق أن المستخدم يمتلك الـ dataset أو أدمن
function requireDatasetAccess(req: any, res: any, next: any) {
  if (process.env.LOCAL_AUTH !== "1") return next();
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });
  if (!canAccessDataset(id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "ليس لديك صلاحية لعرض هذه البيانات" });
  }
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // تسجيل مسارات المصادقة (تعمل فقط إذا LOCAL_AUTH=1)
  registerAuthRoutes(app);
  // نقطة فحص حالة المصادقة (تعمل دائماً)
  app.get("/api/auth/status", (_req, res) => {
    res.json({ enabled: process.env.LOCAL_AUTH === "1" });
  });
  // حماية مسارات البيانات بـ requireAuth (ستتجاوز تلقائياً إذا LOCAL_AUTH مغلق)
  app.use("/api/datasets", requireAuth);
  app.use("/api/filters", requireAuth);
  app.use("/api/saved-filters", requireAuth);
  app.use("/api/pivot", requireAuth);
  app.use("/api/chart", requireAuth);
  app.use("/api/compare", requireAuth);
  
  // تطبيق تحقق الصلاحية على أي عملية تحتوي :id
  // (يعفي /api/datasets/upload و /api/datasets/merge* لأنها لا تحتوي :id رقمي)
  app.use("/api/datasets/:id", (req, res, next) => {
    if (process.env.LOCAL_AUTH !== "1") return next();
    const id = parseInt(req.params.id);
    if (isNaN(id)) return next(); // ليس رقمياً (مثل upload, merge)
    if (!canAccessDataset(id, (req as any).userId, (req as any).userRole)) {
      return res.status(403).json({ error: "ليس لديك صلاحية لعرض هذه البيانات" });
    }
    next();
  });
  // قائمة مجموعات البيانات (مفلترة حسب الصلاحية)
  app.get("/api/datasets", (req: any, res) => {
    const allowedIds = getAccessibleDatasetIds(req.userId, req.userRole);
    const list = storage.listDatasetsForUser(allowedIds).map((d) => {
      const perm = process.env.LOCAL_AUTH === "1"
        ? getUserPermission(d.id, req.userId, req.userRole)
        : "delete";
      return {
        ...d,
        columns: JSON.parse(d.columns) as string[],
        permission: perm,
      };
    });
    res.json(list);
  });

  // جلب مجموعة بيانات واحدة
  app.get("/api/datasets/:id", requireDatasetAccess, (req: any, res) => {
    const id = parseInt(req.params.id);
    const d = storage.getDataset(id);
    if (!d) return res.status(404).json({ error: "غير موجود" });
    const perm = process.env.LOCAL_AUTH === "1"
      ? getUserPermission(id, req.userId, req.userRole)
      : "delete";
    res.json({ ...d, columns: JSON.parse(d.columns) as string[], permission: perm });
  });

  // حذف مجموعة بيانات (soft delete — ينقل للسلّة)
  app.delete("/api/datasets/:id", requireAuth, requireFeature("delete_dataset"), requireDatasetDelete, (req: any, res) => {
    const id = parseInt(req.params.id);
    const ds = storage.getDatasetWithOwner(id);
    storage.deleteDataset(id);
    try {
      const u = authDb.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
      logAudit(req.userId, u?.username || null, "dataset_deleted", {
        targetType: "dataset",
        targetId: String(id),
        details: { name: ds?.name },
        ip: getClientIp(req),
      });
    } catch {}
    res.json({ ok: true, softDeleted: true });
  });

  // سلّة المحذوفات — عرض الملفات المحذوفة (تحسين #14)
  app.get("/api/datasets/trash/list", requireAuth, (req: any, res) => {
    const ids = getAccessibleDatasetIds(req.userId, req.userRole);
    const list = storage.listTrashForUser(ids);
    res.json({
      items: list.map((d: any) => ({
        id: d.id,
        name: d.name,
        fileName: d.file_name,
        rowCount: d.row_count,
        createdAt: d.created_at,
        deletedAt: d.deleted_at,
      })),
    });
  });

  // استعادة ملف محذوف
  app.post("/api/datasets/:id/restore", requireAuth, requireFeature("delete_dataset"), (req: any, res) => {
    const id = parseInt(req.params.id);
    const ds = storage.getDatasetWithOwner(id);
    if (!ds) return res.status(404).json({ error: "غير موجود" });
    if (req.userRole !== "admin" && ds.owner_id !== req.userId) {
      return res.status(403).json({ error: "غير مسموح" });
    }
    const ok = storage.restoreDataset(id);
    try {
      const u = authDb.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
      logAudit(req.userId, u?.username || null, "dataset_restored", {
        targetType: "dataset",
        targetId: String(id),
        details: { name: ds.name },
        ip: getClientIp(req),
      });
    } catch {}
    res.json({ ok });
  });

  // حذف نهائي (تفريغ)
  app.delete("/api/datasets/:id/purge", requireAuth, requireFeature("delete_dataset"), (req: any, res) => {
    const id = parseInt(req.params.id);
    const ds = storage.getDatasetWithOwner(id);
    if (!ds) return res.status(404).json({ error: "غير موجود" });
    if (req.userRole !== "admin" && ds.owner_id !== req.userId) {
      return res.status(403).json({ error: "غير مسموح" });
    }
    storage.purgeDataset(id);
    try {
      const u = authDb.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
      logAudit(req.userId, u?.username || null, "dataset_purged", {
        targetType: "dataset",
        targetId: String(id),
        details: { name: ds.name },
        ip: getClientIp(req),
      });
    } catch {}
    res.json({ ok: true });
  });

  // B: بحث عام (عبر datasets و data_rows)
  app.get("/api/search/global", requireAuth, async (req: any, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (!q || q.length < 2) return res.json({ datasets: [], rows: [] });
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

    // صلاحيات المستخدم
    const accessible = await getAccessibleDatasetIds(req.userId, req.userRole);
    const allowedIds = accessible === "all"
      ? null
      : accessible;
    if (allowedIds && allowedIds.length === 0) return res.json({ datasets: [], rows: [] });

    const like = `%${q}%`;

    // بحث في أسماء/tags الداتاست
    let dsRows: any[];
    if (allowedIds) {
      const placeholders = allowedIds.map(() => "?").join(",");
      dsRows = authDb.prepare(
        `SELECT id, name, columns, tags, row_count, created_at FROM datasets
         WHERE deleted_at IS NULL AND id IN (${placeholders}) AND (LOWER(name) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(columns) LIKE ?)
         ORDER BY created_at DESC LIMIT ?`
      ).all(...allowedIds, like, like, like, limit) as any[];
    } else {
      dsRows = authDb.prepare(
        `SELECT id, name, columns, tags, row_count, created_at FROM datasets
         WHERE deleted_at IS NULL AND (LOWER(name) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(columns) LIKE ?)
         ORDER BY created_at DESC LIMIT ?`
      ).all(like, like, like, limit) as any[];
    }

    // بحث في data_rows.data (JSON نص) — فقط للداتاست المسموح بها
    let rowsMatched: any[] = [];
    try {
      if (allowedIds) {
        const placeholders = allowedIds.map(() => "?").join(",");
        rowsMatched = authDb.prepare(
          `SELECT dr.id, dr.dataset_id, dr.data, d.name as dataset_name FROM data_rows dr
           JOIN datasets d ON d.id = dr.dataset_id
           WHERE d.deleted_at IS NULL AND dr.dataset_id IN (${placeholders}) AND LOWER(dr.data) LIKE ?
           LIMIT ?`
        ).all(...allowedIds, like, limit) as any[];
      } else {
        rowsMatched = authDb.prepare(
          `SELECT dr.id, dr.dataset_id, dr.data, d.name as dataset_name FROM data_rows dr
           JOIN datasets d ON d.id = dr.dataset_id
           WHERE d.deleted_at IS NULL AND LOWER(dr.data) LIKE ?
           LIMIT ?`
        ).all(like, limit) as any[];
      }
    } catch (e: any) {
      console.error("global search rows error:", e.message);
    }

    res.json({
      datasets: dsRows.map((r) => ({
        id: r.id,
        name: r.name,
        tags: r.tags ? (() => { try { return JSON.parse(r.tags); } catch { return []; } })() : [],
        rowCount: r.row_count,
        columns: (() => { try { return JSON.parse(r.columns); } catch { return []; } })(),
      })),
      rows: rowsMatched.map((r) => {
        let snippet = "";
        try {
          const parsed = JSON.parse(r.data);
          const entries = Object.entries(parsed).find(([_, v]) => String(v).toLowerCase().includes(q));
          if (entries) snippet = `${entries[0]}: ${entries[1]}`;
        } catch {}
        return {
          id: r.id,
          datasetId: r.dataset_id,
          datasetName: r.dataset_name,
          snippet,
        };
      }),
    });
  });

  // L: tags للداتاست
  app.get("/api/datasets/:id/tags", requireAuth, requireDatasetAccess, (req: any, res) => {
    const id = parseInt(req.params.id);
    const row = authDb.prepare("SELECT tags FROM datasets WHERE id = ?").get(id) as any;
    let tags: string[] = [];
    try { tags = row?.tags ? JSON.parse(row.tags) : []; } catch {}
    res.json({ tags });
  });

  app.put("/api/datasets/:id/tags", requireAuth, requireDatasetAccess, (req: any, res) => {
    const id = parseInt(req.params.id);
    const incoming = Array.isArray(req.body?.tags) ? req.body.tags : [];
    const tags = incoming
      .filter((t: any) => typeof t === "string")
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0 && t.length <= 40)
      .slice(0, 20);
    authDb.prepare("UPDATE datasets SET tags = ? WHERE id = ?").run(JSON.stringify(tags), id);
    res.json({ tags });
  });

  // قائمة بكل الـ tags المستخدمة (للـ autocomplete)
  app.get("/api/tags/all", requireAuth, (_req: any, res) => {
    const rows = authDb.prepare("SELECT tags FROM datasets WHERE tags IS NOT NULL AND deleted_at IS NULL").all() as any[];
    const set = new Set<string>();
    for (const r of rows) {
      try {
        const arr = JSON.parse(r.tags);
        if (Array.isArray(arr)) arr.forEach((t: string) => typeof t === "string" && set.add(t));
      } catch {}
    }
    res.json({ tags: Array.from(set).sort() });
  });

  // A: إصدارات الداتاست (Snapshots) + مقارنة بصرية
  // إنشاء إصدار (snapshot للصفوف + الأعمدة)
  app.post("/api/datasets/:id/versions", requireAuth, requireDatasetAccess, (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const label = (req.body?.label || "").toString().slice(0, 100);
      const ds = authDb.prepare("SELECT id, columns FROM datasets WHERE id = ?").get(id) as any;
      if (!ds) return res.status(404).json({ error: "not found" });
      const rows = authDb
        .prepare("SELECT id, row_index, data FROM data_rows WHERE dataset_id = ? ORDER BY row_index ASC")
        .all(id) as any[];
      const snapshot = JSON.stringify({
        columns: ds.columns ? JSON.parse(ds.columns) : [],
        rows: rows.map((r) => ({
          id: r.id,
          rowIndex: r.row_index,
          data: r.data ? JSON.parse(r.data) : {},
        })),
      });
      const now = Date.now();
      const info = authDb
        .prepare(
          "INSERT INTO dataset_versions (dataset_id, user_id, label, snapshot, columns, row_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(id, req.userId || null, label || null, snapshot, ds.columns || null, rows.length, now);
      res.json({ id: info.lastInsertRowid, createdAt: now, rowCount: rows.length, label });
    } catch (e: any) {
      console.error("[versions create] error:", e);
      res.status(500).json({ error: e?.message || "server error" });
    }
  });

  // قائمة إصدارات (بدون snapshot الكامل للسرعة)
  app.get("/api/datasets/:id/versions", requireAuth, requireDatasetAccess, (req: any, res) => {
    const id = parseInt(req.params.id);
    const rows = authDb
      .prepare(
        `SELECT v.id, v.label, v.row_count, v.created_at, v.user_id, u.username
         FROM dataset_versions v
         LEFT JOIN users u ON u.id = v.user_id
         WHERE v.dataset_id = ?
         ORDER BY v.created_at DESC
         LIMIT 100`
      )
      .all(id) as any[];
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        label: r.label,
        rowCount: r.row_count,
        createdAt: r.created_at,
        userId: r.user_id,
        username: r.username,
      })),
    });
  });

  // جلب snapshot إصدار واحد للمقارنة
  app.get("/api/datasets/:id/versions/:vid", requireAuth, requireDatasetAccess, (req: any, res) => {
    const id = parseInt(req.params.id);
    const vid = parseInt(req.params.vid);
    const row = authDb
      .prepare("SELECT id, label, row_count, created_at, snapshot FROM dataset_versions WHERE id = ? AND dataset_id = ?")
      .get(vid, id) as any;
    if (!row) return res.status(404).json({ error: "not found" });
    try {
      const snap = JSON.parse(row.snapshot);
      res.json({
        id: row.id,
        label: row.label,
        rowCount: row.row_count,
        createdAt: row.created_at,
        columns: snap.columns || [],
        rows: snap.rows || [],
      });
    } catch (e) {
      res.status(500).json({ error: "bad snapshot" });
    }
  });

  // حذف إصدار
  app.delete("/api/datasets/:id/versions/:vid", requireAuth, requireDatasetAccess, (req: any, res) => {
    const id = parseInt(req.params.id);
    const vid = parseInt(req.params.vid);
    authDb.prepare("DELETE FROM dataset_versions WHERE id = ? AND dataset_id = ?").run(vid, id);
    res.json({ ok: true });
  });

  // سجل نشاط لملف محدد (تحسين #13)
  app.get("/api/datasets/:id/activity", requireAuth, requireDatasetAccess, (req: any, res) => {
    const id = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const rows = authDb
      .prepare(
        `SELECT id, user_id, username, action, target_type, target_id, details, ip, created_at
         FROM audit_log
         WHERE target_type = 'dataset' AND target_id = ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(String(id), limit) as any[];
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        action: r.action,
        details: r.details ? (() => { try { return JSON.parse(r.details); } catch { return r.details; } })() : null,
        ip: r.ip,
        createdAt: r.created_at,
      })),
    });
  });

  // تفضيلات العرض (theme + lang) — محفوظة في DB (تحسين #10)
  app.get("/api/me/prefs", requireAuth, (req: any, res) => {
    const u = authDb
      .prepare("SELECT theme, lang FROM users WHERE id = ?")
      .get(req.userId) as any;
    res.json({ theme: u?.theme || null, lang: u?.lang || null });
  });

  app.put("/api/me/prefs", requireAuth, (req: any, res) => {
    const { theme, lang } = req.body || {};
    const validTheme = theme === "light" || theme === "dark" || theme === null ? theme : null;
    const validLang = lang === "ar" || lang === "en" || lang === null ? lang : null;
    authDb
      .prepare("UPDATE users SET theme = COALESCE(?, theme), lang = COALESCE(?, lang) WHERE id = ?")
      .run(validTheme, validLang, req.userId);
    res.json({ ok: true, theme: validTheme, lang: validLang });
  });

  // مشاركة dataset: جلب قائمة المستخدمين الذين لديهم صلاحية
  app.get("/api/datasets/:id/access", requireDatasetAccess, (req: any, res) => {
    const id = parseInt(req.params.id);
    const ds = storage.getDatasetWithOwner(id);
    if (!ds) return res.status(404).json({ error: "غير موجود" });
    // فقط المالك أو الأدمن يمكنه رؤية أو تعديل الصلاحيات
    if (req.userRole !== "admin" && ds.owner_id !== req.userId) {
      return res.status(403).json({ error: "غير مسموح" });
    }
    const users = authDb
      .prepare(
        `SELECT u.id, u.username, u.role,
         CASE WHEN d.dataset_id IS NOT NULL THEN 1 ELSE 0 END as has_access
         FROM users u
         LEFT JOIN dataset_access d ON d.user_id = u.id AND d.dataset_id = ?
         ORDER BY u.id`
      )
      .all(id);
    res.json({ owner_id: ds.owner_id, users });
  });

  // مشاركة dataset: تحديث قائمة المستخدمين المسموح لهم
  app.post("/api/datasets/:id/access", requireAuth, requireFeature("share_dataset"), requireDatasetAccess, (req: any, res) => {
    const id = parseInt(req.params.id);
    const ds = storage.getDatasetWithOwner(id);
    if (!ds) return res.status(404).json({ error: "غير موجود" });
    if (req.userRole !== "admin" && ds.owner_id !== req.userId) {
      return res.status(403).json({ error: "غير مسموح" });
    }
    const { userIds } = req.body || {};
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: "userIds مطلوب كـ array" });
    }
    // حذف الصلاحيات الحالية وإعادة إضافتها
    // حساب المستخدمين الجدد لإرسال إشعارات
    const previousIds = (authDb
      .prepare("SELECT user_id FROM dataset_access WHERE dataset_id = ?")
      .all(id) as { user_id: number }[]).map((r) => r.user_id);
    const newIds: number[] = [];
    const tx = authDb.transaction(() => {
      authDb.prepare("DELETE FROM dataset_access WHERE dataset_id = ?").run(id);
      const insert = authDb.prepare(
        "INSERT OR IGNORE INTO dataset_access (dataset_id, user_id, granted_at) VALUES (?, ?, ?)"
      );
      const now = Date.now();
      for (const uid of userIds) {
        const userIdNum = parseInt(uid);
        if (isNaN(userIdNum)) continue;
        if (userIdNum === ds.owner_id) continue;
        insert.run(id, userIdNum, now);
        newIds.push(userIdNum);
      }
    });
    tx();
    // إرسال إشعارات لمن أضيفوا حديثاً
    try {
      const added = newIds.filter((u) => !previousIds.includes(u));
      const u = authDb.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
      for (const uid of added) {
        notify(
          uid,
          "share",
          "تمت مشاركة ملف معك",
          `تمت مشاركة "${ds.name}" معك من ${u?.username || "النظام"}`,
          `#/datasets/${id}`
        );
      }
      logAudit(req.userId, u?.username || null, "share_granted", {
        targetType: "dataset",
        targetId: String(id),
        details: { added, removed: previousIds.filter((u2) => !newIds.includes(u2)) },
        ip: getClientIp(req),
      });
    } catch (e) { console.error("[share notify] failed:", e); }
    res.json({ ok: true });
  });

  // رفع ملف Excel/CSV
  app.post(
    "/api/datasets/upload",
    requireAuth,
    requireFeature("upload"),
    upload.single("file"),
    async (req: Request, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "لم يتم إرفاق ملف" });
        }
        const name = (req.body.name as string) || req.file.originalname;

        const wb = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
          defval: "",
          raw: false,
        });

        if (rows.length === 0) {
          return res.status(400).json({ error: "الملف فارغ" });
        }

        // استخراج الأعمدة من أول صف
        const columnsSet = new Set<string>();
        for (const r of rows.slice(0, 100)) {
          Object.keys(r).forEach((k) => columnsSet.add(k));
        }
        const columns = Array.from(columnsSet);

        // إصلاح ترميز اسم الملف العربي (multer يستلمه كـ latin1)
        let safeFileName = req.file.originalname;
        try {
          const decoded = Buffer.from(safeFileName, "latin1").toString("utf8");
          // إذا احتوى المدخل على بايتات UTF-8 صالحة بعد التحويل وتصبح حروفاً عربية فستخدمه
          if (/[؀-ۿ]/.test(decoded) && !/[؀-ۿ]/.test(safeFileName)) {
            safeFileName = decoded;
          }
        } catch {}

        const dataset = storage.createDataset({
          name,
          fileName: safeFileName,
          columns: JSON.stringify(columns),
          rowCount: rows.length,
          ownerId: (req as any).userId ?? null,
        });

        storage.insertRowsBatch(dataset.id, rows);
        try {
          const u = authDb.prepare("SELECT username FROM users WHERE id = ?").get((req as any).userId) as any;
          logAudit((req as any).userId, u?.username || null, "dataset_uploaded", {
            targetType: "dataset",
            targetId: String(dataset.id),
            details: { name, rows: rows.length },
            ip: getClientIp(req),
          });
        } catch {}

        res.json({
          ...dataset,
          columns,
        });
      } catch (e: any) {
        console.error("upload error:", e);
        res.status(500).json({ error: e.message || "خطأ في معالجة الملف" });
      }
    }
  );

  // البحث/الفلترة على الصفوف
  const queryBodySchema = z.object({
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(5000).default(50),
    conditions: filterRequestSchema.shape.conditions.default([]),
    logic: z.enum(["AND", "OR"]).default("AND"),
    sortColumn: z.string().optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
  });

  // 📌 جلب صفوف محددة بحسب IDs — للصفوف المثبّتة (تجاوز الفلاتر)
  app.post("/api/datasets/:id/rows-by-ids", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ids = (req.body?.ids ?? []) as (string | number)[];
      const numericIds = ids
        .map((x) => (typeof x === "number" ? x : parseInt(String(x))))
        .filter((n) => Number.isFinite(n)) as number[];
      const rows = storage.getRowsByIds(id, numericIds);
      res.json({ rows, total: rows.length });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/datasets/:id/query", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = queryBodySchema.parse(req.body);
      const result = storage.queryRows({
        datasetId: id,
        page: parsed.page,
        pageSize: parsed.pageSize,
        conditions: parsed.conditions,
        logic: parsed.logic,
        sortColumn: parsed.sortColumn,
        sortDir: parsed.sortDir,
      });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/datasets/:id/duplicates/preview", requireAuth, requireDatasetAccess, requireFeature("explore"), (req, res) => {
    try {
      const options = duplicatePreviewSchema.parse(req.body);
      res.setHeader("Cache-Control", "private, no-store");
      res.json(previewDuplicates(Number(req.params.id), options, options.page));
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message });
    }
  });
  app.post("/api/datasets/:id/duplicates/delete", requireAuth, requireDatasetEdit, requireFeature("edit_rows"), (req: any, res) => {
    try {
      const options = duplicateDeleteSchema.parse(req.body);
      const id = Number(req.params.id);
      const result = deleteDuplicateCopies(id, req.userId || null, options, options.revision, options.groupKey);
      try {
        logAudit(req.userId, null, "duplicates_deleted", {
          targetType: "dataset", targetId: String(id),
          details: { ...result, match: options.match, columns: options.columns, keep: options.keep },
          ip: getClientIp(req),
        });
      } catch (e) { console.error("[duplicates audit]", e); }
      res.json(result);
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message });
    }
  });

  // حذف صفوف بناءً على شروط
  app.post("/api/datasets/:id/delete-matching", requireAuth, requireFeature("edit_rows"), (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = filterRequestSchema.parse(req.body);
      if (parsed.conditions.length === 0) {
        return res.status(400).json({ error: "يجب تحديد شرط واحد على الأقل" });
      }
      const deleted = storage.deleteRowsMatching(
        id,
        parsed.conditions,
        parsed.logic
      );
      res.json({ deleted });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // تحديث صف واحد
  app.patch("/api/datasets/:id/rows/:rowId", requireAuth, requireFeature("edit_rows"), (req, res) => {
    try {
      const rowId = parseInt(req.params.rowId);
      const data = req.body?.data;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "بيانات غير صالحة" });
      }
      const ok = storage.updateRow(rowId, data);
      if (!ok) return res.status(404).json({ error: "الصف غير موجود" });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // حذف صف واحد
  app.delete("/api/datasets/:id/rows/:rowId", requireAuth, requireFeature("edit_rows"), (req, res) => {
    const rowId = parseInt(req.params.rowId);
    const ok = storage.deleteRow(rowId);
    if (!ok) return res.status(404).json({ error: "الصف غير موجود" });
    res.json({ ok: true });
  });

  // إضافة صف جديد
  app.post("/api/datasets/:id/rows", requireAuth, requireFeature("edit_rows"), (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body?.data;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "بيانات غير صالحة" });
      }
      const row = storage.addRow(id, data);
      if (!row) return res.status(404).json({ error: "مجموعة البيانات غير موجودة" });
      res.json(row);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // تحويل وحدات (إنش <-> سم) على أعمدة مختارة
  app.post("/api/datasets/:id/convert-units", requireAuth, requireFeature("edit_rows"), (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const columns = (req.body?.columns ?? []) as string[];
      const direction = req.body?.direction as "in_to_cm" | "cm_to_in";
      const decimals = Math.max(0, Math.min(6, parseInt(req.body?.decimals ?? 2)));
      if (!Array.isArray(columns) || columns.length === 0) {
        return res.status(400).json({ error: "يجب تحديد عمود واحد على الأقل" });
      }
      if (direction !== "in_to_cm" && direction !== "cm_to_in") {
        return res.status(400).json({ error: "اتجاه التحويل غير صالح" });
      }
      const result = storage.convertUnits(id, columns, direction, decimals);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // إحصاءات عمود
  app.get("/api/datasets/:id/stats/:column", (req, res) => {
    const id = parseInt(req.params.id);
    const col = req.params.column;
    const stats = storage.columnStats(id, col);
    res.json(stats);
  });

  // ========== Merge datasets ==========
  app.post("/api/datasets/merge", (req, res) => {
    try {
      const sourceIds = (req.body?.sourceIds ?? []) as number[];
      const name = String(req.body?.name ?? "").trim();
      const includeSource = req.body?.includeSource !== false;
      const sourceColumnName = String(req.body?.sourceColumnName ?? "").trim();
      if (!Array.isArray(sourceIds) || sourceIds.length < 2) {
        return res.status(400).json({ error: "يجب اختيار ملفين على الأقل" });
      }
      if (!name) return res.status(400).json({ error: "الاسم مطلوب" });
      const result = storage.mergeDatasets(sourceIds, name, {
        includeSource,
        sourceColumnName: sourceColumnName || undefined,
      });
      if (!result) return res.status(400).json({ error: "تعذر الدمج" });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // معاينة اتحاد الأعمدة وإجمالي الصفوف قبل الدمج
  app.post("/api/datasets/merge-preview", (req, res) => {
    try {
      const sourceIds = (req.body?.sourceIds ?? []) as number[];
      if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
        return res.status(400).json({ error: "لم يتم تحديد ملفات" });
      }
      const seen = new Set<string>();
      const unionCols: string[] = [];
      let totalRows = 0;
      const filesInfo: { id: number; name: string; rowCount: number; columns: string[] }[] = [];
      for (const id of sourceIds) {
        const d = storage.getDataset(id);
        if (!d) continue;
        const cols = JSON.parse(d.columns) as string[];
        for (const c of cols) {
          if (!seen.has(c)) {
            seen.add(c);
            unionCols.push(c);
          }
        }
        totalRows += d.rowCount;
        filesInfo.push({ id: d.id, name: d.name, rowCount: d.rowCount, columns: cols });
      }
      res.json({ unionCols, totalRows, filesInfo });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ========== Pivot ==========
  app.post("/api/datasets/:id/pivot", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = pivotRequestSchema.parse(req.body);
      const result = storage.computePivot(id, parsed);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ========== Chart ==========
  app.post("/api/datasets/:id/chart", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = chartRequestSchema.parse(req.body);
      const result = storage.computeChart(id, parsed);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ========== Saved Filters ==========
  app.get("/api/datasets/:id/filters", (req, res) => {
    const id = parseInt(req.params.id);
    const list = storage.listSavedFilters(id).map((f) => ({
      ...f,
      filter: JSON.parse(f.filterJson),
    }));
    res.json(list);
  });

  app.post("/api/datasets/:id/filters", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const name = String(req.body?.name ?? "").trim();
      if (!name) return res.status(400).json({ error: "الاسم مطلوب" });
      const filter = filterRequestSchema.parse(req.body?.filter ?? { conditions: [], logic: "AND" });
      const saved = storage.saveFilter(id, name, filter);
      res.json({ ...saved, filter: JSON.parse(saved.filterJson) });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/datasets/:id/filters/:fid", (req, res) => {
    const fid = parseInt(req.params.fid);
    const ok = storage.deleteSavedFilter(fid);
    if (!ok) return res.status(404).json({ error: "غير موجود" });
    res.json({ ok: true });
  });

  // تصدير إلى Excel (مع تطبيق فلتر اختياري)
  app.post("/api/datasets/:id/export", requireAuth, requireFeature("export"), (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = storage.getDataset(id);
      if (!dataset) return res.status(404).json({ error: "غير موجود" });

      let rows: Record<string, any>[];
      const conditions = (req.body?.conditions ?? []) as any[];
      const logic = (req.body?.logic ?? "AND") as "AND" | "OR";

      if (conditions.length > 0) {
        const r = storage.queryRows({
          datasetId: id,
          page: 1,
          pageSize: 1_000_000,
          conditions,
          logic,
        });
        rows = r.rows.map((x) => x.data);
      } else {
        rows = storage.getAllRows(id);
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "بيانات");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="export_${id}.xlsx"`
      );
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===== إحصائيات لوحة التحكم =====
  app.get("/api/dashboard/stats", requireAuth, (req: any, res) => {
    try {
      const userId = req.userId as number | undefined;
      const userRole = req.userRole as string | undefined;
      const isAdmin = userRole === "admin";
      const useAuth = process.env.LOCAL_AUTH === "1";

      // فلترة الديتاست حسب الصلاحية
      let allowedIds: number[] | null = null;
      if (useAuth && !isAdmin && userId) {
        allowedIds = getAccessibleDatasetIds(userId, userRole);
      }

      const where = allowedIds
        ? `WHERE id IN (${allowedIds.length ? allowedIds.join(",") : "-1"})`
        : "";
      const whereRows = allowedIds
        ? `WHERE dataset_id IN (${allowedIds.length ? allowedIds.join(",") : "-1"})`
        : "";

      const Database = require("better-sqlite3");
      const sqlite = new Database("data.db", { readonly: true });
      try {
        const totalDatasets = (sqlite
          .prepare(`SELECT COUNT(*) as c FROM datasets ${where}`)
          .get() as { c: number }).c;
        const totalRows = (sqlite
          .prepare(`SELECT COALESCE(SUM(row_count),0) as c FROM datasets ${where}`)
          .get() as { c: number }).c;
        const recentDatasets = sqlite
          .prepare(
            `SELECT id, name, file_name, row_count, created_at
             FROM datasets ${where}
             ORDER BY created_at DESC LIMIT 5`
          )
          .all();

        // توزيع زمني: عدد الرفوعات في آخر 12 أسبوع
        const uploadsTimeline = sqlite
          .prepare(
            `SELECT strftime('%Y-%W', created_at) as period, COUNT(*) as count, COALESCE(SUM(row_count),0) as rows
             FROM datasets ${where}
             WHERE created_at >= datetime('now', '-84 days')
             GROUP BY period ORDER BY period ASC`
          )
          .all();

        // أكبر الملفات حسب عدد الصفوف
        const topByRows = sqlite
          .prepare(
            `SELECT id, name, row_count
             FROM datasets ${where}
             ORDER BY row_count DESC LIMIT 5`
          )
          .all();

        // إحصائيات الأدمن فقط
        let adminStats: any = null;
        if (isAdmin && useAuth) {
          try {
            const usersCount = (sqlite
              .prepare(`SELECT COUNT(*) as c FROM users`)
              .get() as { c: number }).c;
            adminStats = { totalUsers: usersCount };
          } catch {
            adminStats = { totalUsers: 0 };
          }
        }

        res.json({
          totalDatasets,
          totalRows,
          totalUploadsThisMonth: (sqlite
            .prepare(
              `SELECT COUNT(*) as c FROM datasets ${where}
               ${where ? "AND" : "WHERE"} created_at >= datetime('now','start of month')`
            )
            .get() as { c: number }).c,
          recentDatasets,
          uploadsTimeline,
          topByRows,
          adminStats,
        });
      } finally {
        sqlite.close();
      }
    } catch (e: any) {
      console.error("dashboard stats error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ===== نسخة احتياطية لقاعدة البيانات (محمية بتوكن) =====
  // تحميل ملف data.db كاملاً. يتطلب Authorization: Bearer <BACKUP_TOKEN>
  // يُستخدم من المهمة المجدولة الأسبوعية.
  // إصلاح أسماء الملفات العربية المشوّهة (للمدير فقط)
  app.post("/api/admin/fix-filenames", requireAuth, async (req: any, res) => {
    try {
      if (req.userRole !== "admin") {
        return res.status(403).json({ error: "admin only" });
      }
      const rows = authDb
        .prepare("SELECT id, file_name FROM datasets WHERE file_name IS NOT NULL")
        .all() as Array<{ id: number; file_name: string }>;
      let fixed = 0;
      const updateStmt = authDb.prepare("UPDATE datasets SET file_name = ? WHERE id = ?");
      for (const r of rows) {
        if (!r.file_name) continue;
        // البحث عن mojibake (بايتات UTF-8 فُسّرت كـ latin1)
        const looksMojibake = /[À-ÿ][-¿]/.test(r.file_name);
        if (!looksMojibake) continue;
        try {
          const fixed_name = Buffer.from(r.file_name, "latin1").toString("utf8");
          // تحقق: تحوّل فعلاً إلى عربية
          if (/[؀-ۿ]/.test(fixed_name) && fixed_name !== r.file_name) {
            updateStmt.run(fixed_name, r.id);
            fixed++;
          }
        } catch {}
      }
      res.json({ ok: true, scanned: rows.length, fixed });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "server error" });
    }
  });

  app.get("/api/admin/backup/db", async (req, res) => {
    try {
      const token = process.env.BACKUP_TOKEN;
      if (!token) {
        return res.status(503).json({ error: "BACKUP_TOKEN not configured on server" });
      }
      const auth = req.headers.authorization || "";
      const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (provided !== token) {
        return res.status(401).json({ error: "unauthorized" });
      }
      const path = await import("node:path");
      const fs = await import("node:fs");
      // نفس المسار المستخدم في storage.ts و auth.ts
      const dbPath = path.resolve(process.cwd(), "data.db");
      if (!fs.existsSync(dbPath)) {
        return res.status(404).json({ error: "data.db not found", path: dbPath });
      }
      const stat = fs.statSync(dbPath);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Length", String(stat.size));
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="data.db"`
      );
      const stream = fs.createReadStream(dbPath);
      stream.pipe(res);
      stream.on("error", (err) => {
        console.error("backup stream error:", err);
        if (!res.headersSent) res.status(500).json({ error: "stream failed" });
      });
    } catch (e: any) {
      console.error("backup endpoint error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ===== H: نسخ احتياطي يومي تلقائي =====
  // ينسخ data.db إلى data.db.backup-YYYYMMDD في نفس المجلد، ويحفظ آخر 7 نسخ
  try {
    const path = await import("node:path");
    const fs = await import("node:fs");
    const dbPath = path.resolve(process.cwd(), "data.db");

    const runBackup = () => {
      try {
        if (!fs.existsSync(dbPath)) return;
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const backupPath = path.resolve(process.cwd(), `data.db.backup-${date}`);
        // لا تنسخ إن كانت النسخة اليوم موجودة
        if (fs.existsSync(backupPath)) return;
        fs.copyFileSync(dbPath, backupPath);
        console.log(`[H-backup] نسخة احتياطية تلقائية: ${backupPath}`);
        // حذف نسخ أقدم من 7 أيام
        const dir = path.dirname(dbPath);
        const files = fs.readdirSync(dir).filter(f => f.startsWith("data.db.backup-"));
        if (files.length > 7) {
          files.sort(); // ترتيب تصاعدي (الأقدم أولاً)
          for (const f of files.slice(0, files.length - 7)) {
            try { fs.unlinkSync(path.join(dir, f)); } catch {}
          }
        }
      } catch (e: any) {
        console.error("[H-backup] فشل النسخ:", e.message);
      }
    };

    // راجع كل ساعة (ينسخ فعلياً مرة في اليوم فقط)
    setInterval(runBackup, 60 * 60 * 1000);
    // نسخة أولى بعد 60 ثانية من بدء السيرفر
    setTimeout(runBackup, 60 * 1000);
    console.log("[H-backup] جدول النسخ الاحتياطي اليومي مفعّل بفاصل 1 ساعة");
  } catch (e) {
    console.error("[H-backup] فشل إعداد الجدول", e);
  }

  return httpServer;
}
