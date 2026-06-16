import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// مجموعة البيانات المرفوعة (Dataset)
export const datasets = sqliteTable("datasets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  columns: text("columns").notNull(), // JSON array
  rowCount: integer("row_count").notNull(),
  createdAt: integer("created_at").notNull(),
});

// صف البيانات (Row) - مرن لأي أعمدة عبر JSON
export const dataRows = sqliteTable("data_rows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  datasetId: integer("dataset_id")
    .notNull()
    .references(() => datasets.id, { onDelete: "cascade" }),
  rowIndex: integer("row_index").notNull(),
  data: text("data").notNull(), // JSON object
});

// فلتر محفوظ باسم
export const savedFilters = sqliteTable("saved_filters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  datasetId: integer("dataset_id")
    .notNull()
    .references(() => datasets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filterJson: text("filter_json").notNull(), // JSON FilterRequest
  createdAt: integer("created_at").notNull(),
});

export type SavedFilter = typeof savedFilters.$inferSelect;

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
  createdAt: true,
});

export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasets.$inferSelect;
export type DataRow = typeof dataRows.$inferSelect;

// أنواع الشروط للفلترة
export const filterConditionSchema = z.object({
  column: z.string(),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "greater_than",
    "less_than",
    "greater_equal",
    "less_equal",
    "is_empty",
    "is_not_empty",
    "between",
  ]),
  value: z.string().optional(),
  value2: z.string().optional(), // للنطاق between
});

export const filterRequestSchema = z.object({
  conditions: z.array(filterConditionSchema),
  logic: z.enum(["AND", "OR"]).default("AND"),
});

export type FilterCondition = z.infer<typeof filterConditionSchema>;
export type FilterRequest = z.infer<typeof filterRequestSchema>;

// طلب Pivot
export const pivotRequestSchema = z.object({
  rowColumn: z.string(),
  colColumn: z.string().optional(), // اختياري - إن لم يوجد، يكون تجميع بمحور واحد
  valueColumn: z.string().optional(), // للدوال غير count
  aggregation: z.enum(["count", "sum", "avg", "min", "max"]).default("count"),
  filter: filterRequestSchema.optional(),
  topN: z.number().int().min(1).max(500).optional(),
});

export type PivotRequest = z.infer<typeof pivotRequestSchema>;

// طلب مخطط بياني
export const chartRequestSchema = z.object({
  labelColumn: z.string(),
  valueColumn: z.string().optional(),
  aggregation: z.enum(["count", "sum", "avg", "min", "max"]).default("count"),
  filter: filterRequestSchema.optional(),
  topN: z.number().int().min(1).max(100).default(20),
});

export type ChartRequest = z.infer<typeof chartRequestSchema>;
