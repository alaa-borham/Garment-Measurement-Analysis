import { createHash } from "node:crypto";
import { authDb } from "./auth";
import type { DuplicateOptions, DuplicatePreview } from "../shared/duplicates";

type StoredRow = { id: number; row_index: number; data: string };
type Group = { key: string; rows: StoredRow[]; keepId: number };
const fail = (status: number, message: string): never => {
  throw Object.assign(new Error(message), { status });
};

// Preserve types, whitespace, case and missing keys. Object key order is irrelevant.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return ["array", value.map(canonical)];
  if (value !== null && typeof value === "object") {
    return ["object", Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])])];
  }
  return [typeof value, value];
}

function scan(datasetId: number, options: DuplicateOptions) {
  const ds = authDb.prepare("SELECT columns FROM datasets WHERE id = ? AND deleted_at IS NULL")
    .get(datasetId) as { columns: string } | undefined;
  if (!ds) fail(404, "الملف غير موجود");
  const fileColumns: string[] = JSON.parse(ds!.columns);
  const columns = options.match === "all" ? fileColumns : fileColumns.filter(c => options.columns.includes(c));
  if (options.match === "columns" && (!columns.length || options.columns.some(c => !fileColumns.includes(c)))) {
    fail(400, "اختر عموداً صالحاً واحداً على الأقل للمطابقة");
  }
  const rows = authDb.prepare("SELECT id, row_index, data FROM data_rows WHERE dataset_id = ? ORDER BY row_index, id")
    .all(datasetId) as StoredRow[];
  const revisionHash = createHash("sha256").update(JSON.stringify([datasetId, ds!.columns, options.match, columns, options.keep]));
  const grouped = new Map<string, StoredRow[]>();
  for (const row of rows) {
    revisionHash.update(JSON.stringify([row.id, row.row_index, row.data]));
    const data = JSON.parse(row.data);
    const key = JSON.stringify(options.match === "all" ? canonical(data) :
      columns.map(c => [Object.prototype.hasOwnProperty.call(data, c), canonical(data[c])]));
    const group = grouped.get(key);
    if (group) group.push(row);
    else grouped.set(key, [row]);
  }
  const groups: Group[] = [];
  for (const [key, matches] of Array.from(grouped)) {
    if (matches.length < 2) continue;
    groups.push({
      key: createHash("sha256").update(key).digest("hex"),
      rows: matches,
      keepId: matches[options.keep === "first" ? 0 : matches.length - 1].id,
    });
  }
  return { ds: ds!, rows, groups, columns, fileColumns, revision: revisionHash.digest("hex") };
}

export function previewDuplicates(datasetId: number, options: DuplicateOptions, requestedPage: number): DuplicatePreview {
  const result = scan(datasetId, options);
  const totalPages = Math.max(1, Math.ceil(result.groups.length / 10));
  const page = Math.min(requestedPage, totalPages);
  return {
    revision: result.revision, totalRows: result.rows.length,
    groupCount: result.groups.length,
    duplicateRows: result.groups.reduce((n, g) => n + g.rows.length, 0),
    extraRows: result.groups.reduce((n, g) => n + g.rows.length - 1, 0),
    page, totalPages, columns: result.columns,
    groups: result.groups.slice((page - 1) * 10, page * 10).map(g => {
      const sample = g.rows.slice(0, 4);
      if (!sample.some(r => r.id === g.keepId)) sample.push(g.rows[g.rows.length - 1]);
      return {
        key: g.key, count: g.rows.length, keepId: g.keepId,
        rows: sample.map(r => ({ id: r.id, rowIndex: r.row_index, data: JSON.parse(r.data) })),
      };
    }),
  };
}

export function deleteDuplicateCopies(
  datasetId: number, userId: number | null, options: DuplicateOptions,
  revision: string, groupKey?: string,
) {
  // Snapshot, stale-preview check, deletion and row count update are atomic.
  return authDb.transaction(() => {
    const result = scan(datasetId, options);
    if (result.revision !== revision) fail(409, "تغيّرت بيانات الملف منذ المعاينة. أعد الفحص قبل الحذف.");
    const groups = groupKey ? result.groups.filter(g => g.key === groupKey) : result.groups;
    if (groupKey && !groups.length) fail(400, "مجموعة التكرار غير موجودة");
    const ids = groups.flatMap(g => g.rows.filter(r => r.id !== g.keepId).map(r => r.id));
    if (!ids.length) return { deleted: 0, remaining: result.rows.length, versionId: null };
    const snapshot = JSON.stringify({
      columns: result.fileColumns,
      rows: result.rows.map(r => ({ id: r.id, rowIndex: r.row_index, data: JSON.parse(r.data) })),
    });
    const version = authDb.prepare(
      "INSERT INTO dataset_versions (dataset_id, user_id, label, snapshot, columns, row_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(datasetId, userId, "قبل حذف التكرار / Before deduplication", snapshot, result.ds.columns, result.rows.length, Date.now());
    const remove = authDb.prepare("DELETE FROM data_rows WHERE dataset_id = ? AND id = ?");
    for (const rowId of ids) {
      if (remove.run(datasetId, rowId).changes !== 1) fail(409, "تغيّرت الصفوف أثناء الحذف، أعد الفحص.");
    }
    const remaining = result.rows.length - ids.length;
    authDb.prepare("UPDATE datasets SET row_count = ? WHERE id = ?").run(remaining, datasetId);
    return { deleted: ids.length, remaining, versionId: Number(version.lastInsertRowid) };
  }).immediate();
}
