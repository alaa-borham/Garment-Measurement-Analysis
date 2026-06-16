import type { Express, Request } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { filterRequestSchema, pivotRequestSchema, chartRequestSchema } from "@shared/schema";
import { z } from "zod";
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

  // حذف مجموعة بيانات (يتطلب صلاحية حذف)
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
    res.json({ ok: true });
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

        const dataset = storage.createDataset({
          name,
          fileName: req.file.originalname,
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

  return httpServer;
}
