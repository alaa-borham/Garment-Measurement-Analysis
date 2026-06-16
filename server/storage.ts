import { datasets, dataRows, savedFilters } from "@shared/schema";
import type {
  Dataset,
  InsertDataset,
  DataRow,
  FilterCondition,
  FilterRequest,
  PivotRequest,
  ChartRequest,
  SavedFilter,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, sql, inArray } from "drizzle-orm";

const sqlite = new Database("data.db");

// Migration: إضافة owner_id لجدول datasets إن لم يكن موجوداً
try {
  const cols = sqlite.prepare("PRAGMA table_info(datasets)").all() as { name: string }[];
  if (cols.length > 0 && !cols.some((c) => c.name === "owner_id")) {
    sqlite.exec("ALTER TABLE datasets ADD COLUMN owner_id INTEGER");
    const firstAdmin = sqlite
      .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")
      .get() as { id: number } | undefined;
    if (firstAdmin) {
      sqlite
        .prepare("UPDATE datasets SET owner_id = ? WHERE owner_id IS NULL")
        .run(firstAdmin.id);
    }
    console.log("[storage migration] owner_id added to datasets");
  }
} catch (e) {
  // تجاهل - الجدول سيُنشأ بـ drizzle
}
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS dataset_access (
    dataset_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    granted_at INTEGER NOT NULL,
    PRIMARY KEY (dataset_id, user_id)
  );
`);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");

// إنشاء الجداول إذا لم تكن موجودة
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    columns TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS data_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_data_rows_dataset ON data_rows(dataset_id);
  CREATE TABLE IF NOT EXISTS saved_filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filter_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_saved_filters_dataset ON saved_filters(dataset_id);
`);

export const db = drizzle(sqlite);

// يستخرج أول رقم من النص حتى لو كانت فيه حروف أو رموز أو وحدات
// أمثلة: "M (40)" -> 40 ، "120cm" -> 120 ، "س،2.5" -> 2.5 ، "-3.5" -> -3.5
function extractNumber(s: string): number {
  if (!s) return NaN;
  const m = s.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return NaN;
  return parseFloat(m[0].replace(",", "."));
}

// تطبيع النص: تجاهل المسافات حول النص، توحيد المسافات الداخلية، إزالة
// المسافات غير العادية مثل NBSP / RLM / LRM / Zero-width
function normalizeText(s: string): string {
  return s
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function matchesCondition(rowData: Record<string, any>, c: FilterCondition): boolean {
  const raw = rowData[c.column];
  const val = raw === undefined || raw === null ? "" : String(raw);
  const num = extractNumber(val);
  const cmp = c.value ?? "";
  const cmp2 = c.value2 ?? "";
  const cmpNum = extractNumber(cmp);
  const cmp2Num = extractNumber(cmp2);
  const valN = normalizeText(val);
  const cmpN = normalizeText(cmp);

  switch (c.operator) {
    case "equals":
      return valN === cmpN;
    case "not_equals":
      return valN !== cmpN;
    case "contains":
      return valN.includes(cmpN);
    case "not_contains":
      return !valN.includes(cmpN);
    case "starts_with":
      return valN.startsWith(cmpN);
    case "ends_with":
      return valN.endsWith(cmpN);
    case "greater_than":
      return !isNaN(num) && !isNaN(cmpNum) && num > cmpNum;
    case "less_than":
      return !isNaN(num) && !isNaN(cmpNum) && num < cmpNum;
    case "greater_equal":
      return !isNaN(num) && !isNaN(cmpNum) && num >= cmpNum;
    case "less_equal":
      return !isNaN(num) && !isNaN(cmpNum) && num <= cmpNum;
    case "is_empty":
      return val === "";
    case "is_not_empty":
      return val !== "";
    case "between":
      return (
        !isNaN(num) &&
        !isNaN(cmpNum) &&
        !isNaN(cmp2Num) &&
        num >= cmpNum &&
        num <= cmp2Num
      );
    default:
      return true;
  }
}

export function evaluateConditions(
  rowData: Record<string, any>,
  conditions: FilterCondition[],
  logic: "AND" | "OR"
): boolean {
  if (conditions.length === 0) return true;
  if (logic === "AND") {
    return conditions.every((c) => matchesCondition(rowData, c));
  }
  return conditions.some((c) => matchesCondition(rowData, c));
}

export class DatabaseStorage {
  createDataset(insert: InsertDataset & { ownerId?: number | null }): Dataset {
    const stmt = sqlite.prepare(
      "INSERT INTO datasets (name, file_name, columns, row_count, created_at, owner_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
    );
    return stmt.get(
      insert.name,
      insert.fileName,
      insert.columns,
      insert.rowCount,
      Date.now(),
      insert.ownerId ?? null
    ) as Dataset;
  }

  listDatasets(): Dataset[] {
    return db.select().from(datasets).orderBy(sql`created_at DESC`).all();
  }

  // جلب الـ datasets المتاحة لمستخدم معين
  listDatasetsForUser(allowedIds: number[] | "all"): Dataset[] {
    if (allowedIds === "all") {
      return this.listDatasets();
    }
    if (allowedIds.length === 0) return [];
    return db
      .select()
      .from(datasets)
      .where(inArray(datasets.id, allowedIds))
      .orderBy(sql`created_at DESC`)
      .all();
  }

  getDataset(id: number): Dataset | undefined {
    return db.select().from(datasets).where(eq(datasets.id, id)).get();
  }

  // جلب dataset مع معلومة owner_id
  getDatasetWithOwner(id: number): (Dataset & { owner_id: number | null }) | undefined {
    return sqlite
      .prepare("SELECT * FROM datasets WHERE id = ?")
      .get(id) as any;
  }

  deleteDataset(id: number): void {
    db.delete(datasets).where(eq(datasets.id, id)).run();
    sqlite.prepare("DELETE FROM dataset_access WHERE dataset_id = ?").run(id);
  }

  // إدراج صفوف بكميات كبيرة (دفعات)
  insertRowsBatch(datasetId: number, rows: Record<string, any>[]): number {
    const insert = sqlite.prepare(
      "INSERT INTO data_rows (dataset_id, row_index, data) VALUES (?, ?, ?)"
    );
    const txn = sqlite.transaction((items: Record<string, any>[]) => {
      let idx = 0;
      for (const r of items) {
        insert.run(datasetId, idx++, JSON.stringify(r));
      }
    });
    txn(rows);
    return rows.length;
  }

  // جلب الصفوف مع pagination والفلترة
  queryRows(params: {
    datasetId: number;
    page: number;
    pageSize: number;
    conditions: FilterCondition[];
    logic: "AND" | "OR";
    sortColumn?: string;
    sortDir?: "asc" | "desc";
  }): { total: number; rows: { id: number; rowIndex: number; data: Record<string, any> }[] } {
    const all = sqlite
      .prepare(
        "SELECT id, row_index as rowIndex, data FROM data_rows WHERE dataset_id = ? ORDER BY row_index ASC"
      )
      .all(params.datasetId) as { id: number; rowIndex: number; data: string }[];

    const filtered = all
      .map((r) => ({ id: r.id, rowIndex: r.rowIndex, data: JSON.parse(r.data) }))
      .filter((r) => evaluateConditions(r.data, params.conditions, params.logic));

    // ترتيب اختياري: رقمي أولاً (لاستخراج رقم من أي نص فيه حروف)، ثم نصي باللغة العربية
    if (params.sortColumn && params.sortDir) {
      const col = params.sortColumn;
      const dir = params.sortDir === "asc" ? 1 : -1;
      filtered.sort((a, b) => {
        const av = a.data[col];
        const bv = b.data[col];
        const aStr = av === undefined || av === null ? "" : String(av);
        const bStr = bv === undefined || bv === null ? "" : String(bv);
        const aEmpty = aStr === "";
        const bEmpty = bStr === "";
        // الفارغ دائماً في الأسفل
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1;
        if (bEmpty) return -1;
        const aNum = (function () {
          const m = aStr.match(/-?\d+(?:[.,]\d+)?/);
          return m ? parseFloat(m[0].replace(",", ".")) : NaN;
        })();
        const bNum = (function () {
          const m = bStr.match(/-?\d+(?:[.,]\d+)?/);
          return m ? parseFloat(m[0].replace(",", ".")) : NaN;
        })();
        if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) {
          return (aNum - bNum) * dir;
        }
        if (!isNaN(aNum) && isNaN(bNum)) return -1 * dir;
        if (isNaN(aNum) && !isNaN(bNum)) return 1 * dir;
        return aStr.localeCompare(bStr, "ar", { numeric: true }) * dir;
      });
    }

    const total = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const slice = filtered.slice(start, start + params.pageSize);
    return { total, rows: slice };
  }

  // جلب كل الصفوف للتصدير
  getAllRows(datasetId: number): Record<string, any>[] {
    const all = sqlite
      .prepare(
        "SELECT data FROM data_rows WHERE dataset_id = ? ORDER BY row_index ASC"
      )
      .all(datasetId) as { data: string }[];
    return all.map((r) => JSON.parse(r.data));
  }

  // حذف الصفوف التي تطابق الشروط
  deleteRowsMatching(
    datasetId: number,
    conditions: FilterCondition[],
    logic: "AND" | "OR"
  ): number {
    const all = sqlite
      .prepare("SELECT id, data FROM data_rows WHERE dataset_id = ?")
      .all(datasetId) as { id: number; data: string }[];

    const toDelete = all
      .map((r) => ({ id: r.id, data: JSON.parse(r.data) }))
      .filter((r) => evaluateConditions(r.data, conditions, logic))
      .map((r) => r.id);

    if (toDelete.length === 0) return 0;

    const del = sqlite.prepare("DELETE FROM data_rows WHERE id = ?");
    const txn = sqlite.transaction((ids: number[]) => {
      for (const id of ids) del.run(id);
    });
    txn(toDelete);

    // تحديث عدد الصفوف
    const remaining = sqlite
      .prepare("SELECT COUNT(*) as c FROM data_rows WHERE dataset_id = ?")
      .get(datasetId) as { c: number };
    db.update(datasets)
      .set({ rowCount: remaining.c })
      .where(eq(datasets.id, datasetId))
      .run();

    return toDelete.length;
  }

  // تحديث بيانات صف واحد
  updateRow(rowId: number, data: Record<string, any>): boolean {
    const res = sqlite
      .prepare("UPDATE data_rows SET data = ? WHERE id = ?")
      .run(JSON.stringify(data), rowId);
    return res.changes > 0;
  }

  // حذف صف واحد
  deleteRow(rowId: number): boolean {
    const row = sqlite
      .prepare("SELECT dataset_id FROM data_rows WHERE id = ?")
      .get(rowId) as { dataset_id: number } | undefined;
    if (!row) return false;
    const res = sqlite.prepare("DELETE FROM data_rows WHERE id = ?").run(rowId);
    if (res.changes > 0) {
      const remaining = sqlite
        .prepare("SELECT COUNT(*) as c FROM data_rows WHERE dataset_id = ?")
        .get(row.dataset_id) as { c: number };
      db.update(datasets)
        .set({ rowCount: remaining.c })
        .where(eq(datasets.id, row.dataset_id))
        .run();
      return true;
    }
    return false;
  }

  // إضافة صف جديد لمجموعة بيانات
  addRow(datasetId: number, data: Record<string, any>): { id: number; rowIndex: number } | null {
    const max = sqlite
      .prepare("SELECT MAX(row_index) as m FROM data_rows WHERE dataset_id = ?")
      .get(datasetId) as { m: number | null };
    const newIndex = (max.m ?? -1) + 1;
    const res = sqlite
      .prepare(
        "INSERT INTO data_rows (dataset_id, row_index, data) VALUES (?, ?, ?)"
      )
      .run(datasetId, newIndex, JSON.stringify(data));
    const remaining = sqlite
      .prepare("SELECT COUNT(*) as c FROM data_rows WHERE dataset_id = ?")
      .get(datasetId) as { c: number };
    db.update(datasets)
      .set({ rowCount: remaining.c })
      .where(eq(datasets.id, datasetId))
      .run();
    return { id: Number(res.lastInsertRowid), rowIndex: newIndex };
  }

  // تحويل الوحدات (إنش <-> سم) على أعمدة مختارة
  convertUnits(
    datasetId: number,
    columns: string[],
    direction: "in_to_cm" | "cm_to_in",
    decimals: number = 2
  ): { updated: number; affectedCells: number } {
    const all = sqlite
      .prepare("SELECT id, data FROM data_rows WHERE dataset_id = ?")
      .all(datasetId) as { id: number; data: string }[];

    const factor = direction === "in_to_cm" ? 2.54 : 1 / 2.54;
    const round = (n: number) => {
      const m = Math.pow(10, decimals);
      return Math.round(n * m) / m;
    };

    const updateStmt = sqlite.prepare(
      "UPDATE data_rows SET data = ? WHERE id = ?"
    );

    let updated = 0;
    let affectedCells = 0;

    const tx = sqlite.transaction(() => {
      for (const r of all) {
        const d = JSON.parse(r.data);
        let rowChanged = false;
        for (const col of columns) {
          const v = d[col];
          if (v === undefined || v === null || v === "") continue;
          const n = parseFloat(String(v));
          if (isNaN(n)) continue;
          d[col] = round(n * factor);
          affectedCells++;
          rowChanged = true;
        }
        if (rowChanged) {
          updateStmt.run(JSON.stringify(d), r.id);
          updated++;
        }
      }
    });
    tx();

    return { updated, affectedCells };
  }

  // إحصاءات عمود رقمي
  columnStats(datasetId: number, column: string): {
    count: number;
    nonEmpty: number;
    numericCount: number;
    min: number | null;
    max: number | null;
    sum: number | null;
    avg: number | null;
    uniqueValues: number;
    topValues: { value: string; count: number }[];
  } {
    const all = sqlite
      .prepare("SELECT data FROM data_rows WHERE dataset_id = ?")
      .all(datasetId) as { data: string }[];

    let count = 0;
    let nonEmpty = 0;
    let numericCount = 0;
    let min: number | null = null;
    let max: number | null = null;
    let sum = 0;
    const counts = new Map<string, number>();

    for (const r of all) {
      count++;
      const d = JSON.parse(r.data);
      const v = d[column];
      const s = v === undefined || v === null ? "" : String(v);
      if (s !== "") {
        nonEmpty++;
        counts.set(s, (counts.get(s) || 0) + 1);
        const n = extractNumber(s);
        if (!isNaN(n)) {
          numericCount++;
          if (min === null || n < min) min = n;
          if (max === null || n > max) max = n;
          sum += n;
        }
      }
    }

    const topValues = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count }));

    return {
      count,
      nonEmpty,
      numericCount,
      min,
      max,
      sum: numericCount > 0 ? sum : null,
      avg: numericCount > 0 ? sum / numericCount : null,
      uniqueValues: counts.size,
      topValues,
    };
  }

  // ========== Pivot ==========
  computePivot(
    datasetId: number,
    req: PivotRequest
  ): {
    rowLabels: string[];
    colLabels: string[]; // فارغ إن لم يوجد colColumn
    matrix: (number | null)[][]; // [row][col]
    rowTotals: number[];
    colTotals: number[];
    grandTotal: number;
  } {
    const all = sqlite
      .prepare("SELECT data FROM data_rows WHERE dataset_id = ?")
      .all(datasetId) as { data: string }[];

    // تطبيق الفلتر إن وجد
    let rows = all.map((r) => JSON.parse(r.data) as Record<string, any>);
    if (req.filter && req.filter.conditions.length > 0) {
      rows = rows.filter((d) =>
        evaluateConditions(d, req.filter!.conditions, req.filter!.logic)
      );
    }

    // جمع القيم في خريطة row -> col -> values[]
    const rowMap = new Map<string, Map<string, number[]>>();
    const rowCountMap = new Map<string, Map<string, number>>();

    const getRowKey = (d: Record<string, any>) => {
      const v = d[req.rowColumn];
      return v === undefined || v === null || v === "" ? "(فارغ)" : String(v);
    };
    const getColKey = (d: Record<string, any>) => {
      if (!req.colColumn) return "__";
      const v = d[req.colColumn];
      return v === undefined || v === null || v === "" ? "(فارغ)" : String(v);
    };

    for (const d of rows) {
      const rk = getRowKey(d);
      const ck = getColKey(d);
      if (!rowMap.has(rk)) {
        rowMap.set(rk, new Map());
        rowCountMap.set(rk, new Map());
      }
      const colVals = rowMap.get(rk)!;
      const colCounts = rowCountMap.get(rk)!;
      if (!colVals.has(ck)) {
        colVals.set(ck, []);
        colCounts.set(ck, 0);
      }
      colCounts.set(ck, colCounts.get(ck)! + 1);
      if (req.aggregation !== "count" && req.valueColumn) {
        const raw = d[req.valueColumn];
        const n = parseFloat(String(raw));
        if (!isNaN(n)) colVals.get(ck)!.push(n);
      }
    }

    // ترتيب الصفوف: حسب مجموع count تنازلياً
    let rowLabels = Array.from(rowMap.keys());
    rowLabels.sort((a, b) => {
      const ca = Array.from(rowCountMap.get(a)!.values()).reduce((s, v) => s + v, 0);
      const cb = Array.from(rowCountMap.get(b)!.values()).reduce((s, v) => s + v, 0);
      return cb - ca;
    });
    if (req.topN && rowLabels.length > req.topN) rowLabels = rowLabels.slice(0, req.topN);

    // ترتيب الأعمدة: حسب الإجمالي العام لكل عمود
    let colLabels: string[] = [];
    if (req.colColumn) {
      const allColSet = new Map<string, number>();
      for (const rk of rowLabels) {
        const colCounts = rowCountMap.get(rk)!;
        colCounts.forEach((c, ck) => {
          allColSet.set(ck, (allColSet.get(ck) || 0) + c);
        });
      }
      colLabels = Array.from(allColSet.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);
      if (req.topN && colLabels.length > req.topN) colLabels = colLabels.slice(0, req.topN);
    } else {
      colLabels = ["__"];
    }

    // حساب المصفوفة
    const matrix: (number | null)[][] = [];
    const rowTotals: number[] = [];
    const colTotals: number[] = new Array(colLabels.length).fill(0);
    let grandTotal = 0;

    for (const rk of rowLabels) {
      const rowVals: (number | null)[] = [];
      let rowTotal = 0;
      const colVals = rowMap.get(rk)!;
      const colCounts = rowCountMap.get(rk)!;
      colLabels.forEach((ck, ci) => {
        let v: number | null = null;
        if (req.aggregation === "count") {
          v = colCounts.get(ck) ?? 0;
        } else {
          const arr = colVals.get(ck) ?? [];
          if (arr.length === 0) v = null;
          else if (req.aggregation === "sum") v = arr.reduce((s, x) => s + x, 0);
          else if (req.aggregation === "avg")
            v = arr.reduce((s, x) => s + x, 0) / arr.length;
          else if (req.aggregation === "min") v = Math.min(...arr);
          else if (req.aggregation === "max") v = Math.max(...arr);
        }
        rowVals.push(v);
        if (v !== null) {
          rowTotal += v;
          colTotals[ci] += v;
        }
      });
      matrix.push(rowVals);
      rowTotals.push(rowTotal);
      grandTotal += rowTotal;
    }

    return { rowLabels, colLabels, matrix, rowTotals, colTotals, grandTotal };
  }

  // ========== Chart ==========
  computeChart(
    datasetId: number,
    req: ChartRequest
  ): { labels: string[]; values: number[]; total: number } {
    const all = sqlite
      .prepare("SELECT data FROM data_rows WHERE dataset_id = ?")
      .all(datasetId) as { data: string }[];

    let rows = all.map((r) => JSON.parse(r.data) as Record<string, any>);
    if (req.filter && req.filter.conditions.length > 0) {
      rows = rows.filter((d) =>
        evaluateConditions(d, req.filter!.conditions, req.filter!.logic)
      );
    }

    const map = new Map<string, { vals: number[]; count: number }>();
    for (const d of rows) {
      const lv = d[req.labelColumn];
      const lk = lv === undefined || lv === null || lv === "" ? "(فارغ)" : String(lv);
      if (!map.has(lk)) map.set(lk, { vals: [], count: 0 });
      const entry = map.get(lk)!;
      entry.count++;
      if (req.aggregation !== "count" && req.valueColumn) {
        const n = parseFloat(String(d[req.valueColumn]));
        if (!isNaN(n)) entry.vals.push(n);
      }
    }

    const items: { label: string; value: number }[] = [];
    map.forEach((e, label) => {
      let v = 0;
      if (req.aggregation === "count") v = e.count;
      else if (e.vals.length > 0) {
        if (req.aggregation === "sum") v = e.vals.reduce((s: number, x: number) => s + x, 0);
        else if (req.aggregation === "avg")
          v = e.vals.reduce((s: number, x: number) => s + x, 0) / e.vals.length;
        else if (req.aggregation === "min") v = Math.min(...e.vals);
        else if (req.aggregation === "max") v = Math.max(...e.vals);
      }
      items.push({ label, value: v });
    });

    items.sort((a, b) => b.value - a.value);
    const limited = items.slice(0, req.topN);
    const total = limited.reduce((s, x) => s + x.value, 0);
    return {
      labels: limited.map((x) => x.label),
      values: limited.map((x) => x.value),
      total,
    };
  }

  // ========== Merge datasets ==========
  mergeDatasets(
    sourceIds: number[],
    newName: string,
    options: { includeSource?: boolean; sourceColumnName?: string }
  ): { dataset: Dataset; rowCount: number; columns: string[] } | null {
    if (sourceIds.length < 2) return null;

    // جلب المجموعات
    const sources = sourceIds
      .map((id) => this.getDataset(id))
      .filter((d): d is Dataset => !!d);
    if (sources.length < 2) return null;

    // اتحاد الأعمدة (بدون تكرار) مع الحفاظ على الترتيب
    const seen = new Set<string>();
    const unionCols: string[] = [];
    for (const s of sources) {
      const cols = JSON.parse(s.columns) as string[];
      for (const c of cols) {
        if (!seen.has(c)) {
          seen.add(c);
          unionCols.push(c);
        }
      }
    }

    const includeSource = options.includeSource !== false;
    const sourceColName = (options.sourceColumnName || "الملف المصدر").trim() || "الملف المصدر";
    if (includeSource && !seen.has(sourceColName)) {
      unionCols.push(sourceColName);
    }

    // إنشاء المجموعة الجديدة
    const newDataset = this.createDataset({
      name: newName,
      fileName: `merged_${sourceIds.join("_")}.xlsx`,
      columns: JSON.stringify(unionCols),
      rowCount: 0,
    });

    // نسخ الصفوف دفعة بدفعة (transaction لكل ملف مصدر)
    const insertStmt = sqlite.prepare(
      "INSERT INTO data_rows (dataset_id, row_index, data) VALUES (?, ?, ?)"
    );
    let rowCount = 0;

    for (const src of sources) {
      const sourceRows = sqlite
        .prepare("SELECT data FROM data_rows WHERE dataset_id = ? ORDER BY row_index ASC")
        .all(src.id) as { data: string }[];

      const txn = sqlite.transaction((rows: { data: string }[]) => {
        for (const r of rows) {
          const orig = JSON.parse(r.data) as Record<string, any>;
          // إعادة بناء الصف بأعمدة الاتحاد
          const newRow: Record<string, any> = {};
          for (const c of unionCols) {
            if (c === sourceColName && includeSource) {
              newRow[c] = src.name;
            } else {
              newRow[c] = orig[c] ?? "";
            }
          }
          insertStmt.run(newDataset.id, rowCount, JSON.stringify(newRow));
          rowCount++;
        }
      });
      txn(sourceRows);
    }

    // تحديث عدد الصفوف
    db.update(datasets)
      .set({ rowCount })
      .where(eq(datasets.id, newDataset.id))
      .run();

    return { dataset: { ...newDataset, rowCount }, rowCount, columns: unionCols };
  }

  // ========== Saved Filters ==========
  listSavedFilters(datasetId: number): SavedFilter[] {
    return sqlite
      .prepare(
        "SELECT id, dataset_id as datasetId, name, filter_json as filterJson, created_at as createdAt FROM saved_filters WHERE dataset_id = ? ORDER BY created_at DESC"
      )
      .all(datasetId) as SavedFilter[];
  }

  saveFilter(datasetId: number, name: string, filter: FilterRequest): SavedFilter {
    const res = sqlite
      .prepare(
        "INSERT INTO saved_filters (dataset_id, name, filter_json, created_at) VALUES (?, ?, ?, ?)"
      )
      .run(datasetId, name, JSON.stringify(filter), Date.now());
    const id = Number(res.lastInsertRowid);
    return sqlite
      .prepare(
        "SELECT id, dataset_id as datasetId, name, filter_json as filterJson, created_at as createdAt FROM saved_filters WHERE id = ?"
      )
      .get(id) as SavedFilter;
  }

  deleteSavedFilter(id: number): boolean {
    const res = sqlite.prepare("DELETE FROM saved_filters WHERE id = ?").run(id);
    return res.changes > 0;
  }
}

export const storage = new DatabaseStorage();
