import { z } from "zod";

export const duplicateOptionsSchema = z.object({
  match: z.enum(["all", "columns"]).default("all"),
  columns: z.array(z.string()).max(1000).default([]),
  keep: z.enum(["first", "last"]).default("first"),
});
export const duplicatePreviewSchema = duplicateOptionsSchema.extend({
  page: z.number().int().min(1).default(1),
});
export const duplicateDeleteSchema = duplicateOptionsSchema.extend({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  groupKey: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  confirmed: z.literal(true),
});
export type DuplicateOptions = z.infer<typeof duplicateOptionsSchema>;
export interface DuplicatePreview {
  revision: string;
  totalRows: number;
  groupCount: number;
  duplicateRows: number;
  extraRows: number;
  page: number;
  totalPages: number;
  columns: string[];
  groups: Array<{
    key: string;
    count: number;
    keepId: number;
    rows: Array<{ id: number; rowIndex: number; data: Record<string, unknown> }>;
  }>;
}
