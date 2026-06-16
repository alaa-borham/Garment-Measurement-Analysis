import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitCompare,
  Rows3,
  Columns3,
  ArrowDownUp,
  Grid3x3,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

interface AdvancedAnalysisProps {
  datasetId: number;
  columns: string[];
}

export interface Row {
  id: number;
  data: Record<string, any>;
}

// استخراج أول رقم من نص
export function extractNumber(s: any): number {
  if (s === null || s === undefined) return NaN;
  const str = String(s);
  if (!str) return NaN;
  const m = str.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return NaN;
  return parseFloat(m[0].replace(",", "."));
}

// نظام الألوان الديناميكي:
// كل band = لون + عتبة دنيا. يتم فرزها تنازلياً حسب minDiff ،
// وأول band تتحقق minDiff <= diff هي اللون المختار.
// إذا لم تتحقق أي band، تستخدم fallback band (أدنى واحد).
export interface ColorBand {
  id: string;
  minDiff: number;
  bg: string;
  fg: string;
  label: string;
}

export const DEFAULT_BANDS: ColorBand[] = [
  { id: "b1", minDiff: 1, bg: "hsl(142, 75%, 38%)", fg: "#ffffff", label: "أخضر غامق" },
  { id: "b2", minDiff: 0.4, bg: "hsl(142, 70%, 70%)", fg: "hsl(142, 80%, 15%)", label: "أخضر فاتح" },
  { id: "b3", minDiff: 0, bg: "hsl(48, 95%, 78%)", fg: "hsl(35, 80%, 20%)", label: "أصفر" },
  { id: "b4", minDiff: -0.4, bg: "hsl(25, 90%, 70%)", fg: "hsl(15, 80%, 20%)", label: "برتقالي" },
  { id: "b5", minDiff: -1, bg: "hsl(0, 80%, 72%)", fg: "hsl(0, 85%, 20%)", label: "أحمر فاتح" },
  { id: "b6", minDiff: -Infinity, bg: "hsl(0, 75%, 38%)", fg: "#ffffff", label: "أحمر غامق" },
];

export function colorForDiff(diff: number, bands: ColorBand[]): { bg: string; fg: string } {
  if (isNaN(diff)) return { bg: "transparent", fg: "inherit" };
  // الفرز تنازلياً حسب minDiff
  const sorted = [...bands].sort((a, b) => b.minDiff - a.minDiff);
  for (const band of sorted) {
    if (diff >= band.minDiff) return { bg: band.bg, fg: band.fg };
  }
  // احتياطي
  const last = sorted[sorted.length - 1];
  return last ? { bg: last.bg, fg: last.fg } : { bg: "transparent", fg: "inherit" };
}

// تنسيق رقم
export function fmt(n: number): string {
  if (isNaN(n)) return "—";
  if (n > 0) return `+${Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, "")}`;
  return String(Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, ""));
}

export default function AdvancedAnalysisPanel({ datasetId, columns }: AdvancedAnalysisProps) {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";

  const L = {
    modeTwoRows: isAr ? "فروق بين صفين" : "Two-row diff",
    modeMatrix: isAr ? "مصفوفة صفوف × أعمدة" : "Rows × Columns matrix",
    modeSequential: isAr ? "فروق متتالية" : "Sequential diff",
    selectRows: isAr ? "اختر الصفوف" : "Select rows",
    selectColumns: isAr ? "اختر الأعمدة" : "Select columns",
    rowA: isAr ? "الصف المرجع" : "Reference row",
    rowB: isAr ? "الصف للمقارنة" : "Compare row",
    selectAll: isAr ? "تحديد الكل" : "Select all",
    clear: isAr ? "مسح التحديد" : "Clear",
    thresholds: isAr ? "ألوان التحليل" : "Analysis colors",
    addColor: isAr ? "إضافة لون" : "Add color",
    removeColor: isAr ? "حذف" : "Remove",
    resetColors: isAr ? "إعادة للافتراضي" : "Reset to default",
    bandLabel: isAr ? "الاسم" : "Label",
    bandMin: isAr ? "الفرق ≥" : "Diff ≥",
    bandBg: isAr ? "خلفية" : "Background",
    bandFg: isAr ? "نص" : "Text",
    fallbackColor: isAr ? "لون أقل قيمة (احتياطي)" : "Fallback (lowest)",
    redHint: isAr ? "الألوان تطبّق بترتيب تنازلي حسب العتبة" : "Colors applied in descending threshold order",
    matrixRefLabel: isAr ? "مقارنة بـ" : "Compare against",
    refFirst: isAr ? "الصف الأول من المختار" : "First selected row",
    refPrevious: isAr ? "الصف السابق" : "Previous row",
    refRaw: isAr ? "القيم الأصلية (بدون فروق)" : "Raw values (no diff)",
    compute: isAr ? "احسب" : "Compute",
    emptyRows: isAr ? "لا توجد صفوف. ارفع ملفاً أولاً." : "No rows yet.",
    needPicks: isAr ? "اختر الصفوف والأعمدة ثم اضغط احسب" : "Pick rows/columns then press Compute",
    column: isAr ? "العمود" : "Column",
    row: isAr ? "الصف" : "Row",
    diff: isAr ? "الفرق" : "Diff",
    diffFormula: isAr ? "الفرق = (الثاني − الأول)" : "Diff = (Second − First)",
    sequentialFormula: isAr
      ? "كل خلية = (قيمة هذا الصف − قيمة الصف السابق)"
      : "Each cell = (this row value − previous row value)",
    rawValues: isAr ? "القيم الأصلية" : "Raw values",
    rowLabel: isAr ? "اسم الصف" : "Row label",
    rowLabelCol: isAr ? "عمود اسم الصف (اختياري)" : "Row label column (optional)",
    none: isAr ? "بدون" : "None",
    searchRows: isAr ? "ابحث عن صف..." : "Search rows...",
    selectAllFiltered: isAr ? "تحديد المفلتر" : "Select filtered",
    showing: isAr ? "يعرض" : "Showing",
    showMore: isAr ? "عرض 500 إضافي" : "Show 500 more",
    useSearch: isAr ? "استخدم البحث لإيجاد صف آخر" : "Use search to find more",
    openInNewTab: isAr ? "فتح في نافذة جديدة" : "Open in new window",
    waitingForData: isAr ? "بانتظار البيانات من النافذة الأصلية..." : "Waiting for data from main window...",
    liveSync: isAr ? "مزامنة مباشرة" : "Live sync",
    closed: isAr ? "تم إغلاق النافذة الأصلية" : "Main window closed",
  };

  // معرّف فريد للجلسة لقناة البث (يثبت طالما المكوّن حي)
  const channelIdRef = useRef<string>(`qiyasat-analysis-${datasetId}-${Math.random().toString(36).slice(2, 9)}`);

  // ألوان التحليل — ديناميكية (يمكن إضافة/حذف/تعديل)
  const [bands, setBands] = useState<ColorBand[]>(DEFAULT_BANDS);

  // وضع مرجع لوضع المصفوفة: فروق عن الصف الأول أو السابق أو بدون (قيم خام)
  const [matrixRef, setMatrixRef] = useState<"first" | "previous" | "raw">("first");

  // الصفوف المختارة (بالـ id)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  // طي/توسيع قسم اختيار الأعمدة (تلقائي عند بدء تحديد الصفوف)
  const [colsCollapsed, setColsCollapsed] = useState<boolean>(false);
  const [colsCollapsedManual, setColsCollapsedManual] = useState<boolean>(false);

  // طي تلقائي عند تحديد ≥1 من الأعمدة وبدء التركيز على الصفوف
  // يطوي عند وجود أعمدة مختارة + بدء تحديد الصفوف، ويفتح إذا لم تبقَ أعمدة مختارة
  useEffect(() => {
    if (colsCollapsedManual) return;
    if (selectedRowIds.size > 0 && selectedCols.size > 0) {
      setColsCollapsed(true);
    } else if (selectedRowIds.size === 0) {
      setColsCollapsed(false);
    }
  }, [selectedRowIds.size, selectedCols.size, colsCollapsedManual]);

  // وضع الصفين
  const [rowAId, setRowAId] = useState<number | null>(null);
  const [rowBId, setRowBId] = useState<number | null>(null);

  // عمود اسم الصف (اختياري)
  const [labelCol, setLabelCol] = useState<string>("");

  // التحديد الفعال للحساب
  const [computed, setComputed] = useState<null | {
    mode: "two-rows" | "matrix" | "sequential";
    rows: Row[];
    cols: string[];
    rowA?: Row;
    rowB?: Row;
    matrixRef?: "first" | "previous" | "raw";
  }>(null);

  // جلب جميع الصفوف (على دفعات حتى 500 لكل طلب)
  const rowsQuery = useQuery<{ rows: Row[]; total: number }>({
    queryKey: ["advanced-rows", datasetId],
    enabled: !!datasetId,
    queryFn: async () => {
      const pageSize = 5000;
      let page = 1;
      let all: Row[] = [];
      let total = 0;
      // حد أقصى أمان: 60 صفحة = 300,000 صف
      for (let i = 0; i < 60; i++) {
        const res = await apiRequest("POST", `/api/datasets/${datasetId}/query`, {
          page,
          pageSize,
          conditions: [],
          logic: "AND",
        });
        const data = await res.json();
        all = all.concat(data.rows || []);
        total = data.total || 0;
        if (all.length >= total || !data.rows?.length) break;
        page++;
      }
      return { rows: all, total };
    },
  });

  const allRows = rowsQuery.data?.rows || [];

  // خريطة: id داخلي -> رقم تسلسلي 1..N
  const rowIndexById = useMemo(() => {
    const m = new Map<number, number>();
    allRows.forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [allRows]);

  // تسمية صف: إذا اختير labelCol استخدمه، وإلا جرّب أول عمود غير فارغ، وإلا رقم تسلسلي
  const rowLabel = (r: Row): string => {
    if (labelCol && r.data[labelCol] !== undefined && r.data[labelCol] !== "") {
      return String(r.data[labelCol]);
    }
    // جرّب أول عمود فيه قيمة غير فارغة ليكون تسمية تلقائية
    for (const c of columns) {
      const v = r.data[c];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        const idx = rowIndexById.get(r.id) ?? r.id;
        return `${idx} · ${String(v)}`;
      }
    }
    return `صف ${rowIndexById.get(r.id) ?? r.id}`;
  };

  // عند تغير الأعمدة المختارة، اختر الكل افتراضياً مرة واحدة
  useEffect(() => {
    if (selectedCols.size === 0 && columns.length > 0) {
      // لا نلمس إذا المستخدم بدأ الاختيار
    }
  }, [columns]);

  // بناء snapshot — رف ثابت لتجنّب مشاكل closure القديم
  const computedRef = useRef(computed);
  const bandsRef = useRef(bands);
  const langRef = useRef(lang);
  const LRef = useRef(L);
  const rowLabelRef = useRef(rowLabel);
  useEffect(() => { computedRef.current = computed; }, [computed]);
  useEffect(() => { bandsRef.current = bands; }, [bands]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { LRef.current = L; });
  useEffect(() => { rowLabelRef.current = rowLabel; });

  const buildSnapshot = () => {
    const c = computedRef.current;
    const b = bandsRef.current;
    let labels: Record<number, string> = {};
    if (c) {
      const list: Row[] = [];
      if (c.rowA) list.push(c.rowA);
      if (c.rowB) list.push(c.rowB);
      list.push(...c.rows);
      list.forEach((r) => { labels[r.id] = rowLabelRef.current(r); });
    }
    return {
      type: "snapshot" as const,
      computed: c,
      bands: b.map((band) => ({ ...band, minDiff: isFinite(band.minDiff) ? band.minDiff : -1e308 })),
      rowLabels: labels,
      lang: langRef.current,
      L: LRef.current,
    };
  };

  // مرجع للنوافذ المفتوحة للإرسال المباشر عبر postMessage
  const openedWindowsRef = useRef<Window[]>([]);

  const broadcastSnapshot = () => {
    const snap = buildSnapshot();
    // 1) postMessage لكل النوافذ المفتوحة مباشرةً
    openedWindowsRef.current = openedWindowsRef.current.filter((w) => !w.closed);
    openedWindowsRef.current.forEach((w) => {
      try { w.postMessage(snap, "*"); } catch {}
    });
    // 2) BroadcastChannel كاحتياطي (إذا same-origin)
    if (channelRef.current) {
      try { channelRef.current.postMessage(snap); } catch {}
    }
  };

  // استقبال رسائل من النوافذ المفتوحة (ready/ping)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "ready" && d?.channel === channelIdRef.current) {
        // تأكد أن المرسل في قائمة النوافذ
        if (e.source && e.source !== window) {
          const src = e.source as Window;
          if (!openedWindowsRef.current.includes(src)) {
            openedWindowsRef.current.push(src);
          }
          try { src.postMessage(buildSnapshot(), "*"); } catch {}
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BroadcastChannel كاحتياطي same-origin
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    try {
      const ch = new BroadcastChannel(channelIdRef.current);
      channelRef.current = ch;
      ch.onmessage = (e) => {
        if (e.data?.type === "ready" || e.data?.type === "ping") {
          try { ch.postMessage(buildSnapshot()); } catch {}
        }
      };
      return () => {
        try { ch.postMessage({ type: "main-closed" }); } catch {}
        ch.close();
        channelRef.current = null;
      };
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // بث عند أي تغيير
  useEffect(() => {
    broadcastSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed, bands, labelCol, lang]);

  const openInNewWindow = () => {
    const url = `${window.location.origin}${window.location.pathname}#/analysis-view?ch=${encodeURIComponent(channelIdRef.current)}`;
    // لا نستخدم noopener حتى نحصل على مرجع النافذة
    const w = window.open(url, "_blank");
    if (w) {
      openedWindowsRef.current.push(w);
      // أرسل snapshot بعد ثوان لتحميل الصفحة (في حال تأخّر إرسال ready)
      const trySend = (delay: number) => setTimeout(() => {
        if (w.closed) return;
        try { w.postMessage(buildSnapshot(), "*"); } catch {}
      }, delay);
      trySend(500);
      trySend(1500);
      trySend(3000);
    }
  };

  const toggleRow = (id: number) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const toggleCol = (c: string) => {
    const next = new Set(selectedCols);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setSelectedCols(next);
  };

  const selectAllRows = () => setSelectedRowIds(new Set(allRows.map((r) => r.id)));
  const clearRows = () => setSelectedRowIds(new Set());
  const selectAllCols = () => setSelectedCols(new Set(columns));
  const clearCols = () => setSelectedCols(new Set());

  const runTwoRows = () => {
    if (rowAId === null || rowBId === null || selectedCols.size === 0) return;
    const a = allRows.find((r) => r.id === rowAId);
    const b = allRows.find((r) => r.id === rowBId);
    if (!a || !b) return;
    setComputed({
      mode: "two-rows",
      rows: [],
      cols: columns.filter((c) => selectedCols.has(c)),
      rowA: a,
      rowB: b,
    });
  };

  const runMatrix = () => {
    if (selectedRowIds.size === 0 || selectedCols.size === 0) return;
    const rows = allRows.filter((r) => selectedRowIds.has(r.id));
    setComputed({
      mode: "matrix",
      rows,
      cols: columns.filter((c) => selectedCols.has(c)),
      matrixRef,
    });
  };

  const runSequential = () => {
    if (selectedRowIds.size < 2 || selectedCols.size === 0) return;
    const rows = allRows.filter((r) => selectedRowIds.has(r.id));
    setComputed({
      mode: "sequential",
      rows,
      cols: columns.filter((c) => selectedCols.has(c)),
    });
  };

  if (rowsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {isAr ? "جارٍ تحميل الصفوف..." : "Loading rows..."}
        </CardContent>
      </Card>
    );
  }

  if (rowsQuery.isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          {isAr ? "تعذّر تحميل الصفوف: " : "Failed to load rows: "}
          {String((rowsQuery.error as any)?.message || rowsQuery.error)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <Tabs defaultValue="matrix">
          <TabsList>
            <TabsTrigger value="matrix" data-testid="adv-mode-matrix">
              <Grid3x3 className="w-4 h-4 me-2" />
              {L.modeMatrix}
            </TabsTrigger>
            <TabsTrigger value="two-rows" data-testid="adv-mode-two-rows">
              <Rows3 className="w-4 h-4 me-2" />
              {L.modeTwoRows}
            </TabsTrigger>
            <TabsTrigger value="sequential" data-testid="adv-mode-sequential">
              <ArrowDownUp className="w-4 h-4 me-2" />
              {L.modeSequential}
            </TabsTrigger>
          </TabsList>

          {/* عمود التسمية + العتبات (مشتركة بين كل الأوضاع) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{L.rowLabelCol}</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                value={labelCol}
                onChange={(e) => setLabelCol(e.target.value)}
              >
                <option value="">{L.none}</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* اختيار الأعمدة (مشترك بين كل الأوضاع) — قابل للطي */}
          <div className="mt-3 rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setColsCollapsed((v) => !v);
                  setColsCollapsedManual(true);
                }}
                className="flex items-center gap-1 text-xs font-semibold hover:opacity-80"
                data-testid="toggle-cols-collapse"
              >
                {colsCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
                <Columns3 className="w-3.5 h-3.5" />
                {L.selectColumns} ({selectedCols.size}/{columns.length})
              </button>
              {!colsCollapsed && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={selectAllCols} className="h-7 text-xs">
                    <CheckSquare className="w-3.5 h-3.5 me-1" />
                    {L.selectAll}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearCols} className="h-7 text-xs">
                    <Square className="w-3.5 h-3.5 me-1" />
                    {L.clear}
                  </Button>
                </div>
              )}
            </div>
            {colsCollapsed ? (
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedCols).slice(0, 12).map((c) => (
                  <span
                    key={c}
                    className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 truncate max-w-[140px]"
                    title={c}
                  >
                    {c}
                  </span>
                ))}
                {selectedCols.size > 12 && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    +{selectedCols.size - 12}
                  </span>
                )}
                {selectedCols.size === 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {isAr ? "لم يتم اختيار أعمدة" : "No columns selected"}
                  </span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-40 overflow-auto">
                {columns.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox checked={selectedCols.has(c)} onCheckedChange={() => toggleCol(c)} />
                    <span className="truncate" title={c}>{c}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* عتبات الألوان */}
          <ColorBandsEditor bands={bands} setBands={setBands} L={L} />

          {/* الوضع 1: مصفوفة */}
          <TabsContent value="matrix" className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{L.matrixRefLabel}</Label>
              <select
                className="w-full sm:w-auto h-9 rounded-md border bg-background px-2 text-sm"
                value={matrixRef}
                onChange={(e) => setMatrixRef(e.target.value as "first" | "previous" | "raw")}
              >
                <option value="first">{L.refFirst}</option>
                <option value="previous">{L.refPrevious}</option>
                <option value="raw">{L.refRaw}</option>
              </select>
            </div>
            <RowSelector
              rows={allRows}
              selected={selectedRowIds}
              toggle={toggleRow}
              selectAll={selectAllRows}
              clear={clearRows}
              rowLabel={rowLabel}
              L={L}
            />
            <Button
              onClick={runMatrix}
              disabled={!selectedRowIds.size || !selectedCols.size}
              data-testid="button-compute-matrix"
            >
              <GitCompare className="w-4 h-4 me-2" />
              {L.compute}
            </Button>
          </TabsContent>

          {/* الوضع 2: صفان */}
          <TabsContent value="two-rows" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SingleRowPicker
                label={L.rowA}
                rows={allRows}
                rowLabel={rowLabel}
                value={rowAId}
                onChange={setRowAId}
                L={L}
              />
              <SingleRowPicker
                label={L.rowB}
                rows={allRows}
                rowLabel={rowLabel}
                value={rowBId}
                onChange={setRowBId}
                L={L}
              />
            </div>
            <Button
              onClick={runTwoRows}
              disabled={rowAId === null || rowBId === null || !selectedCols.size}
              data-testid="button-compute-two-rows"
            >
              <GitCompare className="w-4 h-4 me-2" />
              {L.compute}
            </Button>
          </TabsContent>

          {/* الوضع 3: متتالي */}
          <TabsContent value="sequential" className="mt-4 space-y-3">
            <RowSelector
              rows={allRows}
              selected={selectedRowIds}
              toggle={toggleRow}
              selectAll={selectAllRows}
              clear={clearRows}
              rowLabel={rowLabel}
              L={L}
            />
            <Button
              onClick={runSequential}
              disabled={selectedRowIds.size < 2 || !selectedCols.size}
              data-testid="button-compute-sequential"
            >
              <GitCompare className="w-4 h-4 me-2" />
              {L.compute}
            </Button>
          </TabsContent>
        </Tabs>

        {/* النتائج */}
        {computed && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewWindow}
                className="h-8 text-xs gap-1.5"
                data-testid="button-open-new-window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {L.openInNewTab}
              </Button>
            </div>
            <ResultsTable computed={computed} bands={bands} rowLabel={rowLabel} L={L} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RowSelector({
  rows,
  selected,
  toggle,
  selectAll,
  clear,
  rowLabel,
  L,
}: {
  rows: Row[];
  selected: Set<number>;
  toggle: (id: number) => void;
  selectAll: () => void;
  clear: () => void;
  rowLabel: (r: Row) => string;
  L: any;
}) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(500);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => rowLabel(r).toLowerCase().includes(q));
  }, [rows, search, rowLabel]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  const selectAllFiltered = () => {
    filtered.forEach((r) => {
      if (!selected.has(r.id)) toggle(r.id);
    });
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Rows3 className="w-3.5 h-3.5" />
          {L.selectRows} ({selected.size}/{rows.length})
        </Label>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={search.trim() ? selectAllFiltered : selectAll}
            className="h-7 text-xs"
            title={search.trim() ? (L.selectAllFiltered || L.selectAll) : L.selectAll}
          >
            <CheckSquare className="w-3.5 h-3.5 me-1" />
            {search.trim() ? (L.selectAllFiltered || L.selectAll) : L.selectAll}
          </Button>
          <Button variant="ghost" size="sm" onClick={clear} className="h-7 text-xs">
            <Square className="w-3.5 h-3.5 me-1" />
            {L.clear}
          </Button>
        </div>
      </div>
      <Input
        placeholder={L.searchRows || "ابحث عن صف..."}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setVisibleCount(500);
        }}
        className="h-8 text-xs"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-60 overflow-auto">
        {visible.map((r) => (
          <label
            key={r.id}
            className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
          >
            <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
            <span className="truncate" title={rowLabel(r)}>{rowLabel(r)}</span>
          </label>
        ))}
      </div>
      {hasMore && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {L.showing || "يعرض"} {visible.length} / {filtered.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((c) => c + 500)}
            className="h-7 text-xs"
          >
            {L.showMore || "عرض 500 إضافي"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SingleRowPicker({
  label,
  rows,
  rowLabel,
  value,
  onChange,
  L,
}: {
  label: string;
  rows: Row[];
  rowLabel: (r: Row) => string;
  value: number | null;
  onChange: (id: number | null) => void;
  L: any;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return rows.slice(0, 1000);
    const q = search.toLowerCase();
    return rows.filter((r) => rowLabel(r).toLowerCase().includes(q)).slice(0, 1000);
  }, [rows, search, rowLabel]);

  const currentLabel =
    value !== null ? (rows.find((r) => r.id === value) && rowLabel(rows.find((r) => r.id === value)!)) : null;

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        placeholder={L.searchRows || "ابحث..."}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-xs"
      />
      <select
        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">--</option>
        {value !== null && currentLabel && !filtered.find((r) => r.id === value) && (
          <option value={value}>{currentLabel}</option>
        )}
        {filtered.map((r) => (
          <option key={r.id} value={r.id}>{rowLabel(r)}</option>
        ))}
      </select>
      {rows.length > 1000 && !search.trim() && (
        <p className="text-[10px] text-muted-foreground">
          {L.showing || "يعرض"} 1000 / {rows.length} — {L.useSearch || "استخدم البحث"}
        </p>
      )}
    </div>
  );
}

// تحويل hex → hsl سريع (لعدم تعقيد input color)
function pickContrastingFg(bg: string): string {
  // إذا بدأ بـ hsl استخرج L
  const hslMatch = bg.match(/hsl\([^,]+,[^,]+,\s*(\d+(?:\.\d+)?)%/);
  if (hslMatch) {
    const l = parseFloat(hslMatch[1]);
    return l > 55 ? "hsl(0,0%,12%)" : "#ffffff";
  }
  // hex
  if (bg.startsWith("#")) {
    const hex = bg.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? "#1a1a1a" : "#ffffff";
  }
  return "#1a1a1a";
}

function ColorBandsEditor({
  bands,
  setBands,
  L,
}: {
  bands: ColorBand[];
  setBands: (b: ColorBand[]) => void;
  L: any;
}) {
  // فرز تنازلي للعرض (الأعلى أولاً)
  const sorted = [...bands].sort((a, b) => b.minDiff - a.minDiff);

  const updateBand = (id: string, patch: Partial<ColorBand>) => {
    setBands(bands.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBand = (id: string) => {
    setBands(bands.filter((b) => b.id !== id));
  };

  const addBand = () => {
    // ابحث عن أعلى minDiff غير -Infinity وأضف +0.5
    const finite = bands.filter((b) => isFinite(b.minDiff));
    const maxMin = finite.length ? Math.max(...finite.map((b) => b.minDiff)) : 0;
    const newBand: ColorBand = {
      id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      minDiff: maxMin + 0.5,
      bg: "#7c3aed", // بنفسجي افتراضي
      fg: "#ffffff",
      label: L.bandLabel,
    };
    setBands([...bands, newBand]);
  };

  const resetBands = () => setBands(DEFAULT_BANDS);

  return (
    <div className="mt-3 rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-xs font-semibold">{L.thresholds}</Label>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={addBand} className="h-7 text-xs gap-1">
            <Plus className="w-3.5 h-3.5" />
            {L.addColor}
          </Button>
          <Button variant="ghost" size="sm" onClick={resetBands} className="h-7 text-xs gap-1">
            <RotateCcw className="w-3 h-3" />
            {L.resetColors}
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">{L.redHint}</p>
      <div className="space-y-1.5">
        {sorted.map((band) => {
          const isFallback = !isFinite(band.minDiff);
          return (
            <div
              key={band.id}
              className="flex items-center gap-1.5 flex-wrap rounded-md border bg-background p-1.5"
              style={{ borderLeft: `4px solid ${band.bg}` }}
            >
              <input
                type="color"
                value={band.bg.startsWith("#") ? band.bg : hslToHex(band.bg)}
                onChange={(e) =>
                  updateBand(band.id, { bg: e.target.value, fg: pickContrastingFg(e.target.value) })
                }
                className="w-8 h-8 rounded cursor-pointer border"
                title={L.bandBg}
              />
              <Input
                value={band.label}
                onChange={(e) => updateBand(band.id, { label: e.target.value })}
                className="h-8 text-xs flex-1 min-w-[100px]"
                placeholder={L.bandLabel}
              />
              {isFallback ? (
                <span className="text-[10px] text-muted-foreground px-2">{L.fallbackColor}</span>
              ) : (
                <div className="flex items-center gap-1">
                  <Label className="text-[11px]">{L.bandMin}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={band.minDiff}
                    onChange={(e) =>
                      updateBand(band.id, { minDiff: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 w-20 text-xs"
                  />
                </div>
              )}
              <div
                className="h-8 px-3 rounded text-xs font-bold flex items-center"
                style={{ background: band.bg, color: band.fg }}
              >
                {fmt(isFallback ? -99 : band.minDiff)}
              </div>
              {!isFallback && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBand(band.id)}
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  title={L.removeColor}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// تحويل hsl(h,s%,l%) → #hex (بسيط)
function hslToHex(hsl: string): string {
  const m = hsl.match(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%/);
  if (!m) return "#888888";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface ComputedShape {
  mode: "two-rows" | "matrix" | "sequential";
  rows: Row[];
  cols: string[];
  rowA?: Row;
  rowB?: Row;
  matrixRef?: "first" | "previous" | "raw";
}

export function ResultsTable({
  computed,
  bands,
  rowLabel,
  L,
}: {
  computed: ComputedShape;
  bands: ColorBand[];
  rowLabel: (r: Row) => string;
  L: any;
}) {
  const { mode, rows, cols, rowA, rowB, matrixRef } = computed;

  // وضع 1: صفان
  if (mode === "two-rows" && rowA && rowB) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{L.diffFormula}</p>
        <div className="overflow-auto border rounded-md">
          <table className="w-full text-sm border-separate border-spacing-0 [&_th]:border [&_td]:border [&_th]:border-border/60 [&_td]:border-border/60">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary">{L.column}</th>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary">{rowLabel(rowA)}</th>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary">{rowLabel(rowB)}</th>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary">{L.diff}</th>
              </tr>
            </thead>
            <tbody>
              {cols.map((c) => {
                const a = extractNumber(rowA.data[c]);
                const b = extractNumber(rowB.data[c]);
                const diff = !isNaN(a) && !isNaN(b) ? b - a : NaN;
                const { bg, fg } = colorForDiff(diff, bands);
                // لو العمود نصي بطبيعته، اعرض القيمة الأصلية بدل "—"
                const bothText = isNaN(a) && isNaN(b);
                const diffText = bothText
                  ? String(rowB.data[c] ?? rowA.data[c] ?? "")
                  : fmt(diff);
                return (
                  <tr key={c} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 text-center font-semibold bg-muted/40">{c}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums">{isNaN(a) ? String(rowA.data[c] ?? "—") : a}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums">{isNaN(b) ? String(rowB.data[c] ?? "—") : b}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums font-bold" style={{ background: bg, color: fg }}>
                      {diffText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // وضع 2: مصفوفة
  if (mode === "matrix") {
    const ref = matrixRef ?? "first";
    const headerNote =
      ref === "first"
        ? L.refFirst
        : ref === "previous"
        ? L.refPrevious
        : L.refRaw;
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {ref === "raw" ? L.rawValues : `${L.matrixRefLabel}: ${headerNote}`}
        </p>
        <div className="overflow-auto border rounded-md">
          <table className="w-full text-sm border-separate border-spacing-0 [&_th]:border [&_td]:border [&_th]:border-border/60 [&_td]:border-border/60">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary sticky start-0 bg-primary z-10">
                  {L.row}
                </th>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2 text-center border-b-[3px] border-b-primary whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5 text-center font-semibold bg-muted/40 sticky start-0 z-[1]">
                    {rowLabel(r)}
                  </td>
                  {cols.map((c) => {
                    const v = extractNumber(r.data[c]);
                    let diff = NaN;
                    let displayText = "—";

                    if (ref === "raw") {
                      // عرض القيمة الخام + تلوين حسب العتبات
                      diff = v;
                      displayText = isNaN(v) ? String(r.data[c] ?? "—") : String(v);
                    } else if (ref === "first") {
                      if (i === 0) {
                        // الصف الأول هو المرجع
                        displayText = isNaN(v) ? String(r.data[c] ?? "—") : String(v);
                        return (
                          <td
                            key={c}
                            className="px-3 py-1.5 text-center tabular-nums font-bold bg-muted/30"

                          >
                            {displayText}
                          </td>
                        );
                      }
                      const base = extractNumber(rows[0].data[c]);
                      diff = !isNaN(base) && !isNaN(v) ? v - base : NaN;
                      // لو العمود نصي (لا يحتوي أرقام)، عرض القيمة الأصلية ثابتة
                      if (isNaN(diff)) {
                        displayText = isNaN(v)
                          ? String(r.data[c] ?? "")
                          : String(v);
                      } else {
                        displayText = `${fmt(diff)} (${v})`;
                      }
                    } else if (ref === "previous") {
                      if (i === 0) {
                        displayText = isNaN(v) ? String(r.data[c] ?? "—") : String(v);
                        return (
                          <td
                            key={c}
                            className="px-3 py-1.5 text-center tabular-nums font-bold bg-muted/30"
                          >
                            {displayText}
                          </td>
                        );
                      }
                      const prev = extractNumber(rows[i - 1].data[c]);
                      diff = !isNaN(prev) && !isNaN(v) ? v - prev : NaN;
                      if (isNaN(diff)) {
                        displayText = isNaN(v)
                          ? String(r.data[c] ?? "")
                          : String(v);
                      } else {
                        displayText = `${fmt(diff)} (${v})`;
                      }
                    }

                    const { bg, fg } = colorForDiff(diff, bands);
                    return (
                      <td
                        key={c}
                        className="px-3 py-1.5 text-center tabular-nums font-medium whitespace-nowrap"
                        style={{ background: bg, color: fg }}
                      >
                        {displayText}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // وضع 3: متتالي (كل صف − الصف السابق)
  if (mode === "sequential") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{L.sequentialFormula}</p>
        <div className="overflow-auto border rounded-md">
          <table className="w-full text-sm border-separate border-spacing-0 [&_th]:border [&_td]:border [&_th]:border-border/60 [&_td]:border-border/60">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary sticky start-0 bg-primary z-10">
                  {L.row}
                </th>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2 text-center border-b-[3px] border-b-primary whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5 text-center font-semibold bg-muted/40 sticky start-0 z-[1]">
                    {rowLabel(r)}
                  </td>
                  {cols.map((c) => {
                    if (i === 0) {
                      // أول صف ليس له فرق — اعرض القيمة الأصلية
                      const v = r.data[c];
                      return (
                        <td key={c} className="px-3 py-1.5 text-center text-muted-foreground">
                          {v === null || v === undefined || v === "" ? "—" : String(v)}
                        </td>
                      );
                    }
                    const prev = extractNumber(rows[i - 1].data[c]);
                    const curr = extractNumber(r.data[c]);
                    const diff = !isNaN(prev) && !isNaN(curr) ? curr - prev : NaN;
                    const { bg, fg } = colorForDiff(diff, bands);
                    return (
                      <td
                        key={c}
                        className="px-3 py-1.5 text-center tabular-nums font-medium"
                        style={{ background: bg, color: fg }}
                      >
                        {fmt(diff)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
