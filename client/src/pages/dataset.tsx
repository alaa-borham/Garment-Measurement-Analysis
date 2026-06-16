import { useContext, useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  X,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Search,
  BarChart3,
  Filter,
  Pencil,
  Save,
  Ruler,
  Palette,
  Eraser,
  GripVertical,
  RotateCcw,
  MoreVertical,
  EyeOff,
  Eye,
  ArrowUpAZ,
  ArrowDownAZ,
  Sparkles,
} from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { useAuth } from "@/components/auth-gate";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FilterCondition } from "@shared/schema";
import PivotPanel from "@/components/pivot-panel";
import ChartPanel from "@/components/chart-panel";
import AdvancedAnalysisPanel from "@/components/compare-panel";
import SavedFiltersPanel from "@/components/saved-filters";
import { Table2 } from "lucide-react";
import { useOpenTabs } from "@/lib/open-tabs";
import { DatasetComments } from "@/components/dataset-comments";

interface Dataset {
  id: number;
  name: string;
  fileName: string;
  columns: string[];
  rowCount: number;
}

interface QueryResult {
  total: number;
  rows: { id: number; rowIndex: number; data: Record<string, any> }[];
}

interface Stats {
  count: number;
  nonEmpty: number;
  numericCount: number;
  min: number | null;
  max: number | null;
  sum: number | null;
  avg: number | null;
  uniqueValues: number;
  topValues: { value: string; count: number }[];
}

// لوحة ألوان لتلوين الصفوف والأعمدة
const HIGHLIGHT_COLORS = [
  { name: "amber", bg: "rgba(245, 158, 11, 0.18)", dot: "#f59e0b" },
  { name: "green", bg: "rgba(34, 197, 94, 0.18)", dot: "#22c55e" },
  { name: "blue", bg: "rgba(59, 130, 246, 0.18)", dot: "#3b82f6" },
  { name: "purple", bg: "rgba(168, 85, 247, 0.18)", dot: "#a855f7" },
  { name: "pink", bg: "rgba(236, 72, 153, 0.18)", dot: "#ec4899" },
  { name: "red", bg: "rgba(239, 68, 68, 0.18)", dot: "#ef4444" },
  { name: "teal", bg: "rgba(20, 184, 166, 0.18)", dot: "#14b8a6" },
];

function mergeHighlights(rowColor?: string, colColor?: string): string | undefined {
  if (rowColor && colColor) {
    // عند التقاطع نجعله أعمق قليلاً
    return rowColor.replace("0.18", "0.34");
  }
  return rowColor || colColor;
}

const OPS = [
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
] as const;

const NO_VALUE_OPS = ["is_empty", "is_not_empty"];

export default function DatasetPage({ idProp }: { idProp?: number } = {}) {
  const { t, lang } = useContext(LangContext);
  const { toast } = useToast();
  const [, params] = useRoute("/datasets/:id");
  const [routerLocation, setLocation] = useLocation();
  // بسبب hash routing، الـ query تأتي داخل routerLocation أو داخل params.id (مثل "12?embed=1")
  const rawId = params?.id || "0";
  const idMatch = rawId.match(/^(\d+)/);
  const id = idProp ?? parseInt(idMatch ? idMatch[1] : "0");
  // استخراج query string من hash route أو من window.location.search
  const queryString = (() => {
    if (typeof window === "undefined") return "";
    const hash = window.location.hash || "";
    const qIdx = hash.indexOf("?");
    if (qIdx !== -1) return hash.slice(qIdx + 1);
    return window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : window.location.search;
  })();
  const queryParams = new URLSearchParams(queryString);
  const { openOrFocus, renameByDataset } = useOpenTabs();

  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [appliedConditions, setAppliedConditions] = useState<FilterCondition[]>([]);
  const [appliedLogic, setAppliedLogic] = useState<"AND" | "OR">("AND");
  const [statsColumn, setStatsColumn] = useState<string>("");
  // ترتيب الصفوف حسب عمود محدد (تصاعدي/تنازلي)
  const [sortBy, setSortBy] = useState<{ column: string; dir: "asc" | "desc" } | null>(null);
  // وضع embed: يخفي header لتضمين الصفحة في iframe
  const isEmbedMode = queryParams.get("embed") === "1";
  // قراءة التبويب الافتراضي: URL أولاً، ثم localStorage للملف، ثم explore
  const initialTab = (() => {
    const allowed = ["explore", "analyze", "pivot", "chart", "compare"];
    const t = queryParams.get("tab");
    if (t && allowed.includes(t)) return t;
    // في وضع embed لا نسترجع من localStorage لأن المصدر خارجي
    if (!isEmbedMode) {
      try {
        const saved = window.localStorage.getItem(`qiyasat-last-tab-${id}`);
        if (saved && allowed.includes(saved)) return saved;
      } catch {}
    }
    return "explore";
  })();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  // حفظ آخر تبويب لكل ملف (لا نحفظ في وضع embed)
  useEffect(() => {
    if (isEmbedMode) return;
    try {
      window.localStorage.setItem(`qiyasat-last-tab-${id}`, activeTab);
    } catch {}
  }, [activeTab, id, isEmbedMode]);
  const { user: authUser } = useAuth();
  const canFeat = (f: string) => {
    if (!authUser) return true;
    if (authUser.role === "admin") return true;
    if (!authUser.permissions) return true;
    return authUser.permissions[f] !== false;
  };
  const [editingRow, setEditingRow] = useState<{ id: number | null; data: Record<string, any> } | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertColumns, setConvertColumns] = useState<string[]>([]);
  const [convertDirection, setConvertDirection] = useState<"in_to_cm" | "cm_to_in">("in_to_cm");
  const [convertDecimals, setConvertDecimals] = useState(2);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // تلوين الصفوف والأعمدة (محلي في الواجهة)
  const [rowHighlights, setRowHighlights] = useState<Record<number, string>>({});
  const [colHighlights, setColHighlights] = useState<Record<string, string>>({});
  // ترتيب الأعمدة المخصص (سحب وإفلات)
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [dragColumn, setDragColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  // إخفاء الأعمدة
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const { data: dataset, isLoading: dsLoading } = useQuery<Dataset>({
    queryKey: ["/api/datasets", id],
    enabled: !!id,
  });

  useEffect(() => {
    if (dataset && dataset.columns.length > 0 && !statsColumn) {
      setStatsColumn(dataset.columns[0]);
    }
  }, [dataset, statsColumn]);

  // مزامنة ترتيب الأعمدة مع الجدول الأصلي (يحافظ على ترتيب المستخدم ويضيف أي عمود جديد)
  useEffect(() => {
    if (!dataset) return;
    setColumnOrder((prev) => {
      if (!prev) return dataset.columns;
      const setCols = new Set(dataset.columns);
      const kept = prev.filter((c) => setCols.has(c));
      const added = dataset.columns.filter((c) => !prev.includes(c));
      const next = [...kept, ...added];
      // إذا لم يتغيّر شيء أعد المرجع نفسه
      if (
        next.length === prev.length &&
        next.every((c, i) => c === prev[i])
      ) {
        return prev;
      }
      return next;
    });
  }, [dataset?.id, dataset?.columns]);

  const orderedColumns = columnOrder ?? dataset?.columns ?? [];
  const visibleColumns = orderedColumns.filter((c) => !hiddenColumns.has(c));
  const hiddenList = orderedColumns.filter((c) => hiddenColumns.has(c));

  const hideColumn = (c: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      next.add(c);
      return next;
    });
  };
  const showColumn = (c: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      next.delete(c);
      return next;
    });
  };
  const showAllColumns = () => setHiddenColumns(new Set());

  const handleColumnDrop = (target: string) => {
    if (!dragColumn || dragColumn === target) {
      setDragColumn(null);
      setDragOverColumn(null);
      return;
    }
    setColumnOrder((prev) => {
      const base = prev ?? dataset?.columns ?? [];
      const next = base.filter((c) => c !== dragColumn);
      const idx = next.indexOf(target);
      if (idx < 0) return base;
      next.splice(idx, 0, dragColumn);
      return next;
    });
    setDragColumn(null);
    setDragOverColumn(null);
  };

  const resetColumnOrder = () => {
    if (dataset) setColumnOrder(dataset.columns);
  };

  const isCustomOrder =
    !!dataset &&
    !!columnOrder &&
    (columnOrder.length !== dataset.columns.length ||
      columnOrder.some((c, i) => c !== dataset.columns[i]));

  // تحديث اسم التبويب(ات) عندما يصل dataset (فتح جديد يتم عبر workspace)
  useEffect(() => {
    if (dataset && id) {
      // تغيّر الاسم لأي تبويب لهذا الملف
      renameByDataset(id, dataset.name);
    }
  }, [dataset?.id, dataset?.name, id, renameByDataset]);
  // لتجنب تحذير استخدام openOrFocus
  void openOrFocus;

  const rowsQuery = useQuery<QueryResult>({
    queryKey: ["dataset-rows", id, page, pageSize, appliedConditions, appliedLogic, sortBy],
    enabled: !!id && !!dataset,
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/datasets/${id}/query`, {
        page,
        pageSize,
        conditions: appliedConditions,
        logic: appliedLogic,
        sortColumn: sortBy?.column,
        sortDir: sortBy?.dir,
      });
      return res.json();
    },
  });

  const statsQuery = useQuery<Stats>({
    queryKey: ["/api/datasets", id, "stats", statsColumn],
    enabled: !!id && !!statsColumn,
  });

  const updateRowMutation = useMutation({
    mutationFn: async ({ rowId, data }: { rowId: number; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/datasets/${id}/rows/${rowId}`, { data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataset-rows"] });
      setEditingRow(null);
      toast({ title: lang === "ar" ? "تم الحفظ" : "Saved" });
    },
  });

  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: number) => {
      await apiRequest("DELETE", `/api/datasets/${id}/rows/${rowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataset-rows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets", id] });
      toast({ title: lang === "ar" ? "تم الحذف" : "Deleted" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/datasets/${id}/convert-units`, {
        columns: convertColumns,
        direction: convertDirection,
        decimals: convertDecimals,
      });
      return res.json();
    },
    onSuccess: (data: { updated: number; affectedCells: number }) => {
      queryClient.invalidateQueries({ queryKey: ["dataset-rows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets", id, "stats"] });
      toast({
        title: t.explore.convert.success
          .replace("{cells}", String(data.affectedCells))
          .replace("{rows}", String(data.updated)),
      });
      setConvertOpen(false);
      setConvertColumns([]);
    },
  });

  const toggleConvertColumn = (col: string) => {
    setConvertColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const applyConvert = () => {
    if (convertColumns.length === 0) {
      toast({ title: t.explore.convert.noColumns, variant: "destructive" });
      return;
    }
    convertMutation.mutate();
  };

  const addRowMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("POST", `/api/datasets/${id}/rows`, { data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataset-rows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets", id] });
      setEditingRow(null);
      toast({ title: lang === "ar" ? "تمت الإضافة" : "Added" });
    },
  });

  const startEditRow = (row: { id: number; data: Record<string, any> }) => {
    setEditingRow({ id: row.id, data: { ...row.data } });
  };

  const startAddRow = () => {
    if (!dataset) return;
    const empty: Record<string, any> = {};
    dataset.columns.forEach((c) => (empty[c] = ""));
    setEditingRow({ id: null, data: empty });
  };

  const saveEditingRow = () => {
    if (!editingRow) return;
    if (editingRow.id === null) {
      addRowMutation.mutate(editingRow.data);
    } else {
      updateRowMutation.mutate({ rowId: editingRow.id, data: editingRow.data });
    }
  };

  const deleteMatching = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/datasets/${id}/delete-matching`, {
        conditions,
        logic,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t.explore.deletedCount.replace("{n}", String(data.deleted)),
      });
      queryClient.invalidateQueries({ queryKey: ["dataset-rows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets", id] });
    },
  });

  const applyFilters = () => {
    setAppliedConditions(conditions);
    setAppliedLogic(logic);
    setPage(1);
  };

  const applySavedFilter = (cs: FilterCondition[], lg: "AND" | "OR") => {
    setConditions(cs);
    setLogic(lg);
    setAppliedConditions(cs);
    setAppliedLogic(lg);
    setPage(1);
  };

  const resetFilters = () => {
    setConditions([]);
    setAppliedConditions([]);
    setPage(1);
  };

  const addCondition = () => {
    if (!dataset) return;
    setConditions([
      ...conditions,
      { column: dataset.columns[0] || "", operator: "equals", value: "" },
    ]);
  };

  const updateCondition = (i: number, patch: Partial<FilterCondition>) => {
    setConditions(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };

  const removeCondition = (i: number) => {
    const next = conditions.filter((_, idx) => idx !== i);
    setConditions(next);
    // إذا حذف المستخدم آخر شرط نعيد عرض كل البيانات تلقائياً
    if (next.length === 0) {
      setAppliedConditions([]);
      setPage(1);
    }
  };

  const handleExport = async () => {
    const res = await fetch(
      "__PORT_5000__".startsWith("__")
        ? `/api/datasets/${id}/export`
        : `__PORT_5000__/api/datasets/${id}/export`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conditions: appliedConditions,
          logic: appliedLogic,
        }),
      }
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dataset?.name || "export"}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (dsLoading || !dataset) {
    return <div className="text-muted-foreground">{t.common.loading}</div>;
  }

  const total = rowsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;
  const PrevIcon = lang === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = lang === "ar" ? ChevronLeft : ChevronRight;

  // وضع embed (معرّف أعلى باسم isEmbedMode)
  const isEmbed = isEmbedMode;

  return (
    <div>
      {!isEmbed && (
        <div className="mb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href="/"
                className="text-muted-foreground hover-elevate inline-flex items-center gap-1 px-2 py-1 rounded-md shrink-0"
                data-testid="link-back"
                title={t.common.back}
              >
                <BackIcon className="w-4 h-4" />
              </Link>
              <h1
                className="text-base font-semibold truncate"
                data-testid="text-dataset-name"
                title={dataset.name}
              >
                {dataset.name}
              </h1>
              <Badge variant="secondary" className="text-[10px] shrink-0" data-testid="badge-total-rows">
                {dataset.rowCount.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} {t.common.rows}
              </Badge>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {dataset.columns.length} {t.common.columns}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
              <Download className="w-4 h-4 me-2" />
              {t.common.export}
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className={`flex items-center justify-between gap-2 flex-wrap ${isEmbed ? "hidden" : ""}`}>
          <TabsList>
            {canFeat("explore") && (
            <TabsTrigger value="explore" data-testid="tab-explore">
              <Search className="w-4 h-4 me-2" />
              {t.explore.title}
            </TabsTrigger>
            )}
            {canFeat("analyze") && (
            <TabsTrigger value="analyze" data-testid="tab-analyze">
              <BarChart3 className="w-4 h-4 me-2" />
              {t.analyze.title}
            </TabsTrigger>
            )}
            {canFeat("pivot") && (
            <TabsTrigger value="pivot" data-testid="tab-pivot">
              <Table2 className="w-4 h-4 me-2" />
              {t.pivot.title}
            </TabsTrigger>
            )}
            {canFeat("chart") && (
            <TabsTrigger value="chart" data-testid="tab-chart">
              <BarChart3 className="w-4 h-4 me-2" />
              {t.chart.title}
            </TabsTrigger>
            )}
            {canFeat("compare") && (
            <TabsTrigger value="compare" data-testid="tab-compare">
              <Sparkles className="w-4 h-4 me-2" />
              {t.compare.title}
            </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* تبويب الاستعراض: لوحة الفلاتر الظاهرة + الجدول */}
        <TabsContent value="explore" className="mt-4 space-y-4">
          {/* لوحة الشروط الظاهرة دائماً أعلى الجدول */}
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.explore.filters}</span>
                  {conditions.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {conditions.length} · {logic}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={logic} onValueChange={(v: "AND" | "OR") => setLogic(v)}>
                    <SelectTrigger className="w-28 h-8" data-testid="select-logic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">{t.explore.and}</SelectItem>
                      <SelectItem value="OR">{t.explore.or}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={addCondition} data-testid="button-add-condition">
                    <Plus className="w-4 h-4 me-1" />
                    {t.explore.addCondition}
                  </Button>
                </div>
              </div>

              <SavedFiltersPanel
                datasetId={id}
                conditions={conditions}
                logic={logic}
                onApply={applySavedFilter}
              />

              {conditions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {lang === "ar"
                    ? "أضف شرطاً للبدء بالفلترة، أو اعرض كل البيانات."
                    : "Add a condition to filter, or view all data."}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {conditions.map((c, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap md:flex-nowrap items-center gap-2 p-2 rounded-md bg-muted/40 border"
                      data-testid={`condition-row-${i}`}
                    >
                      <Select
                        value={c.column}
                        onValueChange={(v) => updateCondition(i, { column: v })}
                      >
                        <SelectTrigger className="h-8 w-full md:w-48 md:flex-none" data-testid={`select-col-${i}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dataset.columns.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={c.operator}
                        onValueChange={(v) => updateCondition(i, { operator: v as any })}
                      >
                        <SelectTrigger className="h-8 w-full md:w-44 md:flex-none" data-testid={`select-op-${i}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPS.map((op) => (
                            <SelectItem key={op} value={op}>
                              {t.explore.ops[op]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!NO_VALUE_OPS.includes(c.operator) && (
                        <>
                          <Input
                            value={c.value || ""}
                            onChange={(e) => updateCondition(i, { value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                applyFilters();
                              }
                            }}
                            placeholder={t.explore.value}
                            className="h-8 flex-1 min-w-[8rem]"
                            data-testid={`input-value-${i}`}
                            autoFocus={i === conditions.length - 1 && !c.value}
                          />
                          {c.operator === "between" && (
                            <Input
                              value={c.value2 || ""}
                              onChange={(e) => updateCondition(i, { value2: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  applyFilters();
                                }
                              }}
                              placeholder={t.explore.value2}
                              className="h-8 flex-1 min-w-[8rem]"
                              data-testid={`input-value2-${i}`}
                            />
                          )}
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 ms-auto"
                        onClick={() => removeCondition(i)}
                        data-testid={`button-remove-${i}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <Button onClick={applyFilters} data-testid="button-apply" size="sm">
                  <Search className="w-4 h-4 me-2" />
                  {t.common.apply}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset">
                  {t.common.reset}
                </Button>
                <span className="text-[11px] text-muted-foreground ms-auto">
                  {lang === "ar"
                    ? "تلميح: اضغط Enter لتطبيق الفلتر."
                    : "Tip: press Enter to apply."}
                </span>
                {conditions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" data-testid="button-delete-matching">
                        <Trash2 className="w-4 h-4 me-2" />
                        {t.explore.deleteMatching}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.explore.deleteMatching}</AlertDialogTitle>
                        <AlertDialogDescription>{t.explore.deleteConfirm}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground"
                          onClick={() => deleteMatching.mutate()}
                        >
                          {t.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="text-sm">
                  <span className="font-medium" data-testid="text-results-count">
                    {total.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                  </span>{" "}
                  <span className="text-muted-foreground">{t.explore.results}</span>
                </div>
                <div className="flex items-center gap-2">
                  {sortBy && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSortBy(null)}
                      data-testid="button-clear-sort"
                      title={t.explore.sortClear}
                    >
                      {sortBy.dir === "asc" ? (
                        <ArrowUpAZ className="w-4 h-4 me-1" />
                      ) : (
                        <ArrowDownAZ className="w-4 h-4 me-1" />
                      )}
                      <span className="max-w-[120px] truncate">{sortBy.column}</span>
                      <X className="w-3 h-3 ms-1" />
                    </Button>
                  )}
                  {isCustomOrder && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetColumnOrder}
                      data-testid="button-reset-column-order"
                      title={t.explore.resetColumnOrder}
                    >
                      <RotateCcw className="w-4 h-4 me-1" />
                      {t.explore.resetColumnOrder}
                    </Button>
                  )}
                  {(Object.keys(rowHighlights).length > 0 ||
                    Object.keys(colHighlights).length > 0) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRowHighlights({});
                        setColHighlights({});
                      }}
                      data-testid="button-clear-highlights"
                    >
                      <Eraser className="w-4 h-4 me-1" />
                      {t.explore.clearHighlights}
                    </Button>
                  )}
                  {hiddenList.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid="button-hidden-columns"
                        >
                          <EyeOff className="w-4 h-4 me-1" />
                          {t.explore.hiddenColumns}
                          <Badge variant="secondary" className="text-[10px] ms-2">
                            {hiddenList.length}
                          </Badge>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="end">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {t.explore.hiddenColumns}
                          </span>
                          <button
                            type="button"
                            onClick={showAllColumns}
                            className="text-xs text-primary hover:underline"
                            data-testid="button-show-all-columns"
                          >
                            {t.explore.showAllColumns}
                          </button>
                        </div>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {hiddenList.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => showColumn(c)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-start"
                              data-testid={`button-show-col-${c}`}
                            >
                              <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{c}</span>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConvertOpen(true)}
                    data-testid="button-convert-units"
                  >
                    <Ruler className="w-4 h-4 me-1" />
                    {t.explore.convert.button}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startAddRow}
                    data-testid="button-add-row"
                  >
                    <Plus className="w-4 h-4 me-1" />
                    {t.explore.addRow}
                  </Button>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(parseInt(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-28" data-testid="select-pagesize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[25, 50, 100, 200].map((s) => (
                        <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-auto max-h-[calc(100vh-260px)] min-h-[400px]">
                {rowsQuery.isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">{t.common.loading}</div>
                ) : !rowsQuery.data?.rows.length ? (
                  <div className="p-8 text-center text-muted-foreground">{t.explore.noResults}</div>
                ) : (
                  <table className="w-auto caption-bottom text-sm border-separate border-spacing-0">
                    <TableHeader className="[&_tr]:border-b [&_th]:sticky [&_th]:top-0 [&_th]:bg-primary [&_th]:text-primary-foreground [&_th]:z-20 [&_th]:px-2 [&_th]:h-auto [&_th]:py-2 [&_th]:border-b-[3px] [&_th]:border-b-primary [&_th]:border-s-[3px] [&_th]:border-s-primary-foreground/30 [&_th:first-child]:border-s-0">
                      <TableRow>
                        <TableHead className="w-10 sticky start-0 z-30 bg-primary text-primary-foreground border-e-[3px] border-e-primary-foreground/40 font-bold text-base" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>#</TableHead>
                        {visibleColumns.map((c) => {
                          const isDragging = dragColumn === c;
                          const isOver = dragOverColumn === c && dragColumn && dragColumn !== c;
                          return (
                          <ContextMenu key={c}>
                            <ContextMenuTrigger asChild>
                              <TableHead
                                className={`align-top max-w-[110px] min-w-[80px] transition-colors ${
                                  isOver ? "bg-primary/10 outline outline-2 outline-primary/40" : ""
                                } ${isDragging ? "opacity-40" : ""}`}
                                style={{ background: !isOver ? colHighlights[c] : undefined }}
                                draggable
                                onDragStart={(e) => {
                                  setDragColumn(c);
                                  e.dataTransfer.effectAllowed = "move";
                                  try { e.dataTransfer.setData("text/plain", c); } catch {}
                                }}
                                onDragEnter={(e) => {
                                  e.preventDefault();
                                  if (dragColumn) setDragOverColumn(c);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                }}
                                onDragLeave={() => {
                                  setDragOverColumn((prev) => (prev === c ? null : prev));
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleColumnDrop(c);
                                }}
                                onDragEnd={() => {
                                  setDragColumn(null);
                                  setDragOverColumn(null);
                                }}
                                data-testid={`th-col-${c}`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <GripVertical
                                    className="w-3 h-3 mt-0.5 opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0 text-primary-foreground"
                                    aria-label={t.explore.dragColumn}
                                  />
                                  <ColorPickerPopover
                                    label={t.explore.highlightCol}
                                    clearLabel={t.explore.clearHighlights}
                                    currentColor={colHighlights[c]}
                                    onPick={(bg) =>
                                      setColHighlights((prev) => ({ ...prev, [c]: bg }))
                                    }
                                    onClear={() =>
                                      setColHighlights((prev) => {
                                        const next = { ...prev };
                                        delete next[c];
                                        return next;
                                      })
                                    }
                                  >
                                    <button
                                      type="button"
                                      className="flex items-center gap-1.5 text-primary-foreground hover:opacity-80 transition-opacity group/h"
                                      data-testid={`button-highlight-col-${c}`}
                                    >
                                      <Palette className="w-3 h-3 opacity-60 group-hover/h:opacity-100 shrink-0 mt-0.5" />
                                      <span className="whitespace-normal break-words leading-tight text-[13px] font-bold text-center tracking-wide" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
                                        {c}
                                      </span>
                                    </button>
                                  </ColorPickerPopover>
                                  {/* أزرار الترتيب المرئية بجانب اسم العمود */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (sortBy?.column === c && sortBy.dir === "asc") {
                                        setSortBy({ column: c, dir: "desc" });
                                      } else if (sortBy?.column === c && sortBy.dir === "desc") {
                                        setSortBy(null);
                                      } else {
                                        setSortBy({ column: c, dir: "asc" });
                                      }
                                    }}
                                    className="flex flex-col items-center justify-center shrink-0 hover:bg-primary-foreground/15 rounded p-0.5"
                                    title={lang === "ar" ? "رتّب تصاعدياً / تنازلياً" : "Sort ascending / descending"}
                                    data-testid={`button-sort-col-${c}`}
                                  >
                                    <ArrowUpAZ
                                      className={`w-3 h-3 -mb-0.5 ${
                                        sortBy?.column === c && sortBy.dir === "asc"
                                          ? "text-primary-foreground"
                                          : "text-primary-foreground/40"
                                      }`}
                                    />
                                    <ArrowDownAZ
                                      className={`w-3 h-3 ${
                                        sortBy?.column === c && sortBy.dir === "desc"
                                          ? "text-primary-foreground"
                                          : "text-primary-foreground/40"
                                      }`}
                                    />
                                  </button>
                                </div>
                              </TableHead>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="min-w-[200px]">
                              <ContextMenuItem
                                onClick={() => setSortBy({ column: c, dir: "asc" })}
                                data-testid={`menuitem-sort-asc-${c}`}
                              >
                                <ArrowUpAZ className="w-3.5 h-3.5 me-2" />
                                {t.explore.sortAsc}
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => setSortBy({ column: c, dir: "desc" })}
                                data-testid={`menuitem-sort-desc-${c}`}
                              >
                                <ArrowDownAZ className="w-3.5 h-3.5 me-2" />
                                {t.explore.sortDesc}
                              </ContextMenuItem>
                              {sortBy && (
                                <ContextMenuItem onClick={() => setSortBy(null)}>
                                  <RotateCcw className="w-3.5 h-3.5 me-2" />
                                  {t.explore.sortClear}
                                </ContextMenuItem>
                              )}
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() => hideColumn(c)}
                                data-testid={`menuitem-hide-col-${c}`}
                              >
                                <EyeOff className="w-3.5 h-3.5 me-2" />
                                {t.explore.hideColumn}
                              </ContextMenuItem>
                              {hiddenList.length > 0 && (
                                <>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem onClick={showAllColumns}>
                                    <Eye className="w-3.5 h-3.5 me-2" />
                                    {t.explore.showAllColumns}
                                  </ContextMenuItem>
                                </>
                              )}
                            </ContextMenuContent>
                          </ContextMenu>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rowsQuery.data.rows.map((r) => (
                        <TableRow
                          key={r.id}
                          data-testid={`row-${r.id}`}
                          className="group [&_td]:border-s-[3px] [&_td]:border-s-foreground/25 [&_td]:border-b-[2px] [&_td]:border-b-foreground/15 [&_td:first-child]:border-s-0"
                          style={{ background: rowHighlights[r.id] }}
                        >
                          <TableCell
                            className="text-primary-foreground text-xs relative w-10 sticky start-0 z-10 border-e-[3px] border-e-primary-foreground/30 bg-primary/90"
                            style={rowHighlights[r.id] ? { background: rowHighlights[r.id] } : undefined}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <ColorPickerPopover
                                label={t.explore.highlightRow}
                                clearLabel={t.explore.clearHighlights}
                                currentColor={rowHighlights[r.id]}
                                onPick={(bg) =>
                                  setRowHighlights((prev) => ({ ...prev, [r.id]: bg }))
                                }
                                onClear={() =>
                                  setRowHighlights((prev) => {
                                    const next = { ...prev };
                                    delete next[r.id];
                                    return next;
                                  })
                                }
                              >
                                <button
                                  type="button"
                                  className="flex items-center gap-1 hover:text-primary transition-colors"
                                  data-testid={`button-highlight-row-${r.id}`}
                                >
                                  <Palette className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                                  <span>{r.rowIndex + 1}</span>
                                </button>
                              </ColorPickerPopover>
                              <RowActionsMenu
                                rowId={r.id}
                                onEdit={() => startEditRow(r)}
                                onDelete={() => deleteRowMutation.mutate(r.id)}
                                t={t}
                              />
                            </div>
                          </TableCell>
                          {visibleColumns.map((c) => (
                            <TableCell
                              key={c}
                              className="whitespace-nowrap text-sm px-2 py-2 max-w-[110px] truncate"
                              style={{
                                background: mergeHighlights(
                                  rowHighlights[r.id],
                                  colHighlights[c]
                                ),
                              }}
                              title={String(r.data[c] ?? "")}
                            >
                              {String(r.data[c] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  {t.explore.page} {page} {t.explore.of} {totalPages}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    data-testid="button-prev-page"
                  >
                    <PrevIcon className="w-4 h-4 me-1" />
                    {t.explore.prev}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    data-testid="button-next-page"
                  >
                    {t.explore.next}
                    <NextIcon className="w-4 h-4 ms-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyze" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{t.analyze.selectColumn}:</span>
                <Select value={statsColumn} onValueChange={setStatsColumn}>
                  <SelectTrigger className="w-64" data-testid="select-analyze-column">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataset.columns.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 ms-2">
                  <Button
                    variant={sortBy?.column === statsColumn && sortBy.dir === "asc" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (!statsColumn) return;
                      setSortBy({ column: statsColumn, dir: "asc" });
                      setActiveTab("explore");
                    }}
                    data-testid="button-analyze-sort-asc"
                  >
                    <ArrowUpAZ className="w-4 h-4 me-1" />
                    {t.explore.sortAsc}
                  </Button>
                  <Button
                    variant={sortBy?.column === statsColumn && sortBy.dir === "desc" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (!statsColumn) return;
                      setSortBy({ column: statsColumn, dir: "desc" });
                      setActiveTab("explore");
                    }}
                    data-testid="button-analyze-sort-desc"
                  >
                    <ArrowDownAZ className="w-4 h-4 me-1" />
                    {t.explore.sortDesc}
                  </Button>
                  {sortBy && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSortBy(null)}
                      data-testid="button-analyze-sort-clear"
                    >
                      <X className="w-4 h-4 me-1" />
                      {t.explore.sortClear}
                    </Button>
                  )}
                </div>
              </div>

              {statsQuery.isLoading ? (
                <div className="text-muted-foreground">{t.common.loading}</div>
              ) : statsQuery.data ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <StatCard label={t.analyze.totalRows} value={statsQuery.data.count} lang={lang} />
                    <StatCard label={t.analyze.nonEmpty} value={statsQuery.data.nonEmpty} lang={lang} />
                    <StatCard label={t.analyze.uniqueValues} value={statsQuery.data.uniqueValues} lang={lang} />
                    <StatCard label={t.analyze.numeric} value={statsQuery.data.numericCount} lang={lang} />
                    {statsQuery.data.min !== null && (
                      <StatCard label={t.analyze.min} value={statsQuery.data.min} lang={lang} />
                    )}
                    {statsQuery.data.max !== null && (
                      <StatCard label={t.analyze.max} value={statsQuery.data.max} lang={lang} />
                    )}
                    {statsQuery.data.avg !== null && (
                      <StatCard
                        label={t.analyze.avg}
                        value={Number(statsQuery.data.avg.toFixed(2))}
                        lang={lang}
                      />
                    )}
                    {statsQuery.data.sum !== null && (
                      <StatCard
                        label={t.analyze.sum}
                        value={Number(statsQuery.data.sum.toFixed(2))}
                        lang={lang}
                      />
                    )}
                  </div>

                  {statsQuery.data.topValues.length > 0 && (
                    <div className="pt-2">
                      <div className="text-sm font-medium mb-3">{t.analyze.topValues}</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statsQuery.data.topValues}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="value" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 8,
                              }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pivot" className="mt-4">
          <PivotPanel datasetId={id} columns={dataset.columns} />
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <ChartPanel datasetId={id} columns={dataset.columns} />
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <AdvancedAnalysisPanel datasetId={id} columns={dataset.columns} />
        </TabsContent>
      </Tabs>

      {/* Dialog لتعديل أو إضافة صف */}
      <Dialog
        open={editingRow !== null}
        onOpenChange={(o) => !o && setEditingRow(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRow?.id === null ? t.explore.newRow : t.explore.editRow}
            </DialogTitle>
          </DialogHeader>
          {editingRow && (
            <div className="grid sm:grid-cols-2 gap-3 py-2">
              {dataset.columns.map((col) => (
                <div key={col} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{col}</Label>
                  <Input
                    value={String(editingRow.data[col] ?? "")}
                    onChange={(e) =>
                      setEditingRow({
                        ...editingRow,
                        data: { ...editingRow.data, [col]: e.target.value },
                      })
                    }
                    data-testid={`input-edit-${col}`}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingRow(null)}>
              {t.explore.cancelEdit}
            </Button>
            <Button
              onClick={saveEditingRow}
              disabled={updateRowMutation.isPending || addRowMutation.isPending}
              data-testid="button-save-row"
            >
              <Save className="w-4 h-4 me-2" />
              {t.explore.saveRow}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تحويل الوحدات */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              {t.explore.convert.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              {t.explore.convert.desc}
            </p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* اتجاه التحويل */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t.explore.convert.direction}
              </Label>
              <RadioGroup
                value={convertDirection}
                onValueChange={(v) =>
                  setConvertDirection(v as "in_to_cm" | "cm_to_in")
                }
                className="grid sm:grid-cols-2 gap-2"
              >
                <label
                  htmlFor="dir-in-cm"
                  className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value="in_to_cm" id="dir-in-cm" />
                  <span className="text-sm">{t.explore.convert.inToCm}</span>
                </label>
                <label
                  htmlFor="dir-cm-in"
                  className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value="cm_to_in" id="dir-cm-in" />
                  <span className="text-sm">{t.explore.convert.cmToIn}</span>
                </label>
              </RadioGroup>
            </div>

            {/* الأعمدة */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t.explore.convert.columns}
                  <span className="ms-2 text-xs text-muted-foreground">
                    ({convertColumns.length}/{dataset.columns.length})
                  </span>
                </Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConvertColumns([...dataset.columns])}
                    data-testid="button-select-all-cols"
                  >
                    {t.explore.convert.selectAll}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConvertColumns([])}
                    data-testid="button-clear-all-cols"
                  >
                    {t.explore.convert.clearAll}
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto rounded-md border p-3">
                {dataset.columns.map((col) => (
                  <label
                    key={col}
                    htmlFor={`conv-col-${col}`}
                    className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-accent rounded px-2 -mx-2"
                  >
                    <Checkbox
                      id={`conv-col-${col}`}
                      checked={convertColumns.includes(col)}
                      onCheckedChange={() => toggleConvertColumn(col)}
                      data-testid={`checkbox-conv-${col}`}
                    />
                    <span className="text-sm truncate">{col}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* المنازل العشرية */}
            <div className="space-y-2">
              <Label htmlFor="convert-decimals" className="text-sm font-medium">
                {t.explore.convert.decimals}
              </Label>
              <Input
                id="convert-decimals"
                type="number"
                min={0}
                max={6}
                value={convertDecimals}
                onChange={(e) =>
                  setConvertDecimals(
                    Math.max(0, Math.min(6, parseInt(e.target.value) || 0))
                  )
                }
                className="w-24"
                data-testid="input-convert-decimals"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConvertOpen(false)}>
              {t.common.cancel}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={
                    convertColumns.length === 0 || convertMutation.isPending
                  }
                  data-testid="button-apply-convert"
                >
                  <Ruler className="w-4 h-4 me-2" />
                  {t.explore.convert.apply}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t.explore.convert.confirmTitle}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.explore.convert.confirmDesc.replace(
                      "{n}",
                      String(convertColumns.length)
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={applyConvert}>
                    {t.common.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* قسم التعليقات */}
      {id ? (
        <div className="mt-6">
          <DatasetComments datasetId={String(id)} />
        </div>
      ) : null}
    </div>
  );
}

function ColorPickerPopover({
  children,
  label,
  clearLabel,
  currentColor,
  onPick,
  onClear,
}: {
  children: React.ReactNode;
  label: string;
  clearLabel: string;
  currentColor?: string;
  onPick: (bg: string) => void;
  onClear: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="text-xs text-muted-foreground mb-2 px-1">{label}</div>
        <div className="flex items-center gap-1.5">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onPick(c.bg)}
              className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                currentColor === c.bg ? "border-foreground" : "border-transparent"
              }`}
              style={{ background: c.dot }}
              aria-label={c.name}
              data-testid={`color-${c.name}`}
            />
          ))}
          {currentColor && (
            <button
              type="button"
              onClick={onClear}
              className="h-6 w-6 rounded-full border-2 border-transparent hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-destructive"
              aria-label={clearLabel}
              data-testid="color-clear"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RowActionsMenu({
  rowId,
  onEdit,
  onDelete,
  t,
}: {
  rowId: number;
  onEdit: () => void;
  onDelete: () => void;
  t: any;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground opacity-50 group-hover:opacity-100 hover:bg-accent hover:text-foreground focus:opacity-100 focus:outline-none transition-opacity"
            data-testid={`button-row-actions-${rowId}`}
            aria-label={t.common.actions}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem
            onClick={onEdit}
            data-testid={`menuitem-edit-${rowId}`}
          >
            <Pencil className="w-3.5 h-3.5 me-2" />
            {t.explore.editRow}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirmOpen(true)}
            data-testid={`menuitem-delete-${rowId}`}
          >
            <Trash2 className="w-3.5 h-3.5 me-2" />
            {t.explore.deleteRow}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.explore.deleteRow}</AlertDialogTitle>
            <AlertDialogDescription>{t.explore.deleteRowConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                onDelete();
                setConfirmOpen(false);
              }}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatCard({
  label,
  value,
  lang,
}: {
  label: string;
  value: number;
  lang: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3" data-testid={`stat-${label}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-base font-bold font-mono">
        {value.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
      </div>
    </div>
  );
}
