import { useState, useEffect, useContext, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  GitCompare,
  X,
  ExternalLink,
  BarChart3,
  Eye,
  TrendingUp,
  Filter,
  Plus,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { FilterCondition } from "@shared/schema";

interface Dataset {
  id: number;
  name: string;
  fileName: string;
  rowsCount?: number;
  columns?: string[];
}

interface QueryResult {
  rows: Array<{ id: number; data: Record<string, any> }>;
  total: number;
  columns?: string[];
}

interface Stats {
  min: number;
  max: number;
  avg: number;
  median: number;
  count: number;
  sum: number;
  stdDev: number;
}

type Operator = FilterCondition["operator"];

const OPS: Operator[] = [
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
  "between",
  "is_empty",
  "is_not_empty",
];

const NO_VALUE_OPS: Operator[] = ["is_empty", "is_not_empty"];

const OP_LABEL_AR: Record<Operator, string> = {
  equals: "يساوي",
  not_equals: "لا يساوي",
  contains: "يحتوي",
  not_contains: "لا يحتوي",
  starts_with: "يبدأ بـ",
  ends_with: "ينتهي بـ",
  greater_than: "أكبر من",
  less_than: "أصغر من",
  greater_equal: "أكبر أو يساوي",
  less_equal: "أصغر أو يساوي",
  between: "بين",
  is_empty: "فارغ",
  is_not_empty: "غير فارغ",
};

const OP_LABEL_EN: Record<Operator, string> = {
  equals: "equals",
  not_equals: "not equals",
  contains: "contains",
  not_contains: "not contains",
  starts_with: "starts with",
  ends_with: "ends with",
  greater_than: ">",
  less_than: "<",
  greater_equal: ">=",
  less_equal: "<=",
  between: "between",
  is_empty: "is empty",
  is_not_empty: "not empty",
};

// تنسيق رقمي ذكي مع فواصل أو اختصار للأرقام الكبيرة
function fmtNum(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (isNaN(n) || !isFinite(n)) return String(v);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 10_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function StatBox({
  label,
  value,
  highlight,
  colSpan,
  tooltip,
}: {
  label: string;
  value: string | number | undefined;
  highlight?: boolean;
  colSpan?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={`rounded-lg p-2.5 transition-all ${
        highlight
          ? "bg-primary/10 border border-primary/40 shadow-sm"
          : "bg-card border hover:border-primary/30"
      } ${colSpan ? "col-span-3" : ""}`}
      title={tooltip}
    >
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`font-mono font-bold text-sm truncate ${
          highlight ? "text-primary" : "text-foreground"
        }`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function DatasetPanel({
  dsId,
  onChange,
  onRemove,
  datasets,
  isAr,
  panelNumber,
}: {
  dsId: number | null;
  onChange: (id: number) => void;
  onRemove: () => void;
  datasets: Dataset[];
  isAr: boolean;
  panelNumber: number;
}) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzeColumn, setAnalyzeColumn] = useState<string>("");
  const [columnStats, setColumnStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showRows, setShowRows] = useState(false);

  // الفلاتر المتقدمة
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [appliedConditions, setAppliedConditions] = useState<FilterCondition[]>([]);
  const [appliedLogic, setAppliedLogic] = useState<"AND" | "OR">("AND");

  // أقسام قابلة للطي/الفتح
  const [showStats, setShowStats] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showAllCols, setShowAllCols] = useState(true);

  // تحميل بيانات الملف عند تغير المعرف أو الفلاتر المطبقة
  useEffect(() => {
    if (!dsId) {
      setDataset(null);
      setData(null);
      setColumnStats(null);
      setAnalyzeColumn("");
      setConditions([]);
      setAppliedConditions([]);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/datasets/${dsId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/datasets/${dsId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: 1,
          pageSize: 1000,
          conditions: appliedConditions,
          logic: appliedLogic,
        }),
      }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([dsInfo, queryRes]) => {
        if (dsInfo) {
          setDataset({
            id: dsInfo.id,
            name: dsInfo.name,
            fileName: dsInfo.fileName,
            rowsCount: dsInfo.rowsCount,
            columns: dsInfo.columns,
          });
        }
        if (queryRes) setData(queryRes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dsId, appliedConditions, appliedLogic]);

  // إحصائيات لكل الأعمدة الرقمية (تحسب من الصفوف المفلترة)
  const allStats = useMemo(() => {
    if (!data?.rows || !dataset?.columns) return {};
    const result: Record<string, { min: number; max: number; avg: number; count: number; sum: number }> = {};
    dataset.columns.forEach((col) => {
      const nums = data.rows
        .map((r) => Number(r.data?.[col]))
        .filter((n) => !isNaN(n) && isFinite(n));
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        result[col] = {
          min: Math.min(...nums),
          max: Math.max(...nums),
          avg: sum / nums.length,
          count: nums.length,
          sum,
        };
      }
    });
    return result;
  }, [data, dataset]);

  const numericColumns = useMemo(() => Object.keys(allStats), [allStats]);

  useEffect(() => {
    if (!analyzeColumn && numericColumns.length > 0) {
      setAnalyzeColumn(numericColumns[0]);
    }
  }, [numericColumns, analyzeColumn]);

  // إحصائيات الخادم (للعمود) — تتجاهل الفلاتر، فلا نستخدمها عند تفعيل الفلاتر
  useEffect(() => {
    if (!dsId || !analyzeColumn || appliedConditions.length > 0) {
      setColumnStats(null);
      return;
    }
    setStatsLoading(true);
    fetch(`/api/datasets/${dsId}/stats/${encodeURIComponent(analyzeColumn)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        setColumnStats(s);
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  }, [dsId, analyzeColumn, appliedConditions]);

  // Histogram - 10 خانات (من الصفوف المفلترة)
  const histogramData = useMemo(() => {
    if (!analyzeColumn || !data?.rows) return [];
    const nums = data.rows
      .map((r) => Number(r.data?.[analyzeColumn]))
      .filter((n) => !isNaN(n) && isFinite(n));
    if (nums.length === 0) return [];
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const bins = 10;
    const step = (max - min) / bins || 1;
    const buckets = Array(bins)
      .fill(0)
      .map((_, i) => ({
        range: fmtNum(min + i * step),
        count: 0,
      }));
    nums.forEach((n) => {
      let idx = Math.floor((n - min) / step);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      buckets[idx].count++;
    });
    return buckets;
  }, [analyzeColumn, data]);

  // إجراءات الفلاتر
  const addCondition = () => {
    if (!dataset?.columns?.length) return;
    setConditions([
      ...conditions,
      { column: dataset.columns[0] || "", operator: "equals", value: "" },
    ]);
    setAdvancedOpen(true);
  };

  const updateCondition = (i: number, patch: Partial<FilterCondition>) => {
    setConditions(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };

  const removeCondition = (i: number) => {
    const next = conditions.filter((_, idx) => idx !== i);
    setConditions(next);
    if (next.length === 0) {
      setAppliedConditions([]);
      setAppliedLogic(logic);
    }
  };

  const applyFilters = () => {
    setAppliedConditions(conditions);
    setAppliedLogic(logic);
  };

  const resetFilters = () => {
    setConditions([]);
    setAppliedConditions([]);
  };

  const hasActiveFilters = appliedConditions.length > 0;

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 space-y-2 bg-muted/30 border-b">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="default" className="shrink-0 text-xs">
            #{panelNumber}
          </Badge>
          <select
            value={dsId || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 px-3 py-2 text-sm rounded-md border bg-background min-w-0 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="">{isAr ? "اختر ملفاً..." : "Select dataset..."}</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {dataset && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="text-muted-foreground truncate flex-1" title={dataset.fileName}>
              <span className="font-medium">{dataset.fileName}</span>
              <span className="mx-1">·</span>
              <span className="font-mono">
                {fmtNum(data?.total ?? dataset.rowsCount ?? 0)} {isAr ? "صف" : "rows"}
                {hasActiveFilters && (
                  <span className="ms-1 text-primary">
                    {isAr ? "(مفلتر)" : "(filtered)"}
                  </span>
                )}
              </span>
            </div>
            <Link
              href={`/datasets/${dataset.id}`}
              className="text-primary hover:underline flex items-center gap-1 shrink-0 font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              {isAr ? "فتح كامل" : "Open"}
            </Link>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 flex-1 p-4">
        {!dsId && (
          <div className="text-center text-sm text-muted-foreground py-16">
            <GitCompare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {isAr ? "اختر ملفاً من القائمة أعلاه" : "Select a dataset"}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              {isAr ? "جارٍ التحميل..." : "Loading..."}
            </span>
          </div>
        )}

        {!loading && dataset && data && (
          <>
            {/* زر التحليل المتقدم */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button
                variant={advancedOpen || hasActiveFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setAdvancedOpen((o) => !o)}
                className="gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isAr ? "تحليل متقدم" : "Advanced Analysis"}
                {appliedConditions.length > 0 && (
                  <Badge variant="secondary" className="ms-1 text-[10px] h-4 px-1.5">
                    {appliedConditions.length} · {appliedLogic}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="gap-1 text-muted-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isAr ? "إعادة تعيين" : "Reset"}
                </Button>
              )}
            </div>

            {/* لوحة الفلاتر المتقدمة */}
            {advancedOpen && (
              <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-3 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-primary/20 pb-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Filter className="w-4 h-4 text-primary" />
                    {isAr ? "شروط الفلترة" : "Filter conditions"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={logic}
                      onChange={(e) => setLogic(e.target.value as "AND" | "OR")}
                      className="h-7 px-2 text-xs rounded border bg-background"
                    >
                      <option value="AND">{isAr ? "كل الشروط (AND)" : "All (AND)"}</option>
                      <option value="OR">{isAr ? "أي شرط (OR)" : "Any (OR)"}</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCondition}
                      className="h-7 gap-1 text-xs"
                      disabled={!dataset.columns?.length}
                    >
                      <Plus className="w-3 h-3" />
                      {isAr ? "إضافة شرط" : "Add"}
                    </Button>
                  </div>
                </div>

                {conditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    {isAr
                      ? 'لا توجد شروط. اضغط "إضافة شرط" لإنشاء فلتر.'
                      : 'No conditions. Click "Add" to create a filter.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {conditions.map((c, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-md bg-muted/50 border"
                      >
                        <select
                          value={c.column}
                          onChange={(e) => updateCondition(i, { column: e.target.value })}
                          className="h-7 px-1.5 text-xs rounded border bg-background flex-1 min-w-[100px]"
                        >
                          {dataset.columns?.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                        <select
                          value={c.operator}
                          onChange={(e) =>
                            updateCondition(i, { operator: e.target.value as Operator })
                          }
                          className="h-7 px-1.5 text-xs rounded border bg-background w-[110px]"
                        >
                          {OPS.map((op) => (
                            <option key={op} value={op}>
                              {isAr ? OP_LABEL_AR[op] : OP_LABEL_EN[op]}
                            </option>
                          ))}
                        </select>
                        {!NO_VALUE_OPS.includes(c.operator) && (
                          <>
                            <input
                              value={c.value || ""}
                              onChange={(e) => updateCondition(i, { value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  applyFilters();
                                }
                              }}
                              placeholder={isAr ? "القيمة" : "Value"}
                              className="h-7 px-1.5 text-xs rounded border bg-background flex-1 min-w-[80px]"
                            />
                            {c.operator === "between" && (
                              <input
                                value={c.value2 || ""}
                                onChange={(e) => updateCondition(i, { value2: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    applyFilters();
                                  }
                                }}
                                placeholder={isAr ? "إلى" : "To"}
                                className="h-7 px-1.5 text-xs rounded border bg-background flex-1 min-w-[80px]"
                              />
                            )}
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => removeCondition(i)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {conditions.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-primary/10">
                    <Button
                      size="sm"
                      onClick={applyFilters}
                      className="h-7 gap-1 text-xs"
                    >
                      <Filter className="w-3 h-3" />
                      {isAr ? "تطبيق" : "Apply"}
                    </Button>
                    <span className="text-[10px] text-muted-foreground">
                      {isAr ? "Enter للتطبيق السريع" : "Press Enter to apply"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* اختيار عمود للتحليل */}
            {numericColumns.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {isAr ? "اختر عموداً للتحليل" : "Analyze column"}
                  <span className="text-[10px] font-normal normal-case">
                    ({numericColumns.length} {isAr ? "عمود" : "cols"})
                  </span>
                </label>
                <select
                  value={analyzeColumn}
                  onChange={(e) => setAnalyzeColumn(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                >
                  {numericColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* إحصائيات تفصيلية للعمود المحدد */}
            {analyzeColumn && (
              <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowStats((s) => !s)}
                  className="text-sm font-bold flex items-center justify-between border-b border-primary/20 pb-2 w-full hover:opacity-80 transition-opacity"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate" title={analyzeColumn}>{analyzeColumn}</span>
                    {hasActiveFilters && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {isAr ? "مفلتر" : "filtered"}
                      </Badge>
                    )}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {statsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                    {showStats ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </span>
                </button>

                {showStats && (columnStats && !hasActiveFilters ? (
                  <div className="grid grid-cols-3 gap-2">
                    <StatBox label={isAr ? "العدد" : "Count"} value={fmtNum(columnStats.count)} tooltip={String(columnStats.count)} />
                    <StatBox label={isAr ? "المجموع" : "Sum"} value={fmtNum(columnStats.sum)} tooltip={String(columnStats.sum)} />
                    <StatBox label={isAr ? "المتوسط" : "Avg"} value={fmtNum(columnStats.avg)} highlight tooltip={String(columnStats.avg)} />
                    <StatBox label={isAr ? "الأدنى" : "Min"} value={fmtNum(columnStats.min)} tooltip={String(columnStats.min)} />
                    <StatBox label={isAr ? "الوسيط" : "Median"} value={fmtNum(columnStats.median)} tooltip={String(columnStats.median)} />
                    <StatBox label={isAr ? "الأعلى" : "Max"} value={fmtNum(columnStats.max)} tooltip={String(columnStats.max)} />
                    <StatBox
                      label={isAr ? "الانحراف المعياري" : "Std Dev"}
                      value={fmtNum(columnStats.stdDev)}
                      tooltip={String(columnStats.stdDev)}
                      colSpan
                    />
                  </div>
                ) : allStats[analyzeColumn] ? (
                  <div className="grid grid-cols-3 gap-2">
                    <StatBox label={isAr ? "العدد" : "Count"} value={fmtNum(allStats[analyzeColumn].count)} />
                    <StatBox label={isAr ? "المجموع" : "Sum"} value={fmtNum(allStats[analyzeColumn].sum)} />
                    <StatBox label={isAr ? "المتوسط" : "Avg"} value={fmtNum(allStats[analyzeColumn].avg)} highlight />
                    <StatBox label={isAr ? "الأدنى" : "Min"} value={fmtNum(allStats[analyzeColumn].min)} />
                    <StatBox label={isAr ? "الأعلى" : "Max"} value={fmtNum(allStats[analyzeColumn].max)} colSpan />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    {isAr ? "لا توجد بيانات" : "No data"}
                  </div>
                ))}
              </div>
            )}

            {/* رسم بياني (Histogram) */}
            {histogramData.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowChart((s) => !s)}
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between w-full hover:text-foreground transition-colors"
                >
                  <span>{isAr ? "توزيع القيم" : "Distribution"}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-[10px] font-normal normal-case">
                      {isAr ? "10 فترات" : "10 bins"}
                    </span>
                    {showChart ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>
                {showChart && (
                <div className="h-44 rounded-lg border bg-card p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="range"
                        tick={{ fontSize: 9 }}
                        interval={1}
                        angle={-25}
                        textAnchor="end"
                        height={42}
                      />
                      <YAxis tick={{ fontSize: 9 }} width={30} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelFormatter={(label) => (isAr ? `فترة: ${label}` : `Range: ${label}`)}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                )}
              </div>
            )}

            {/* جدول كل الإحصائيات الرقمية */}
            {numericColumns.length > 1 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAllCols((s) => !s)}
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between w-full hover:text-foreground transition-colors"
                >
                  <span>{isAr ? "كل الأعمدة الرقمية" : "All numeric columns"}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-[10px] font-normal normal-case">
                      {isAr ? "اضغط للتحليل" : "Click to analyze"}
                    </span>
                    {showAllCols ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>
                {showAllCols && (
                <div className="max-h-56 overflow-y-auto rounded-lg border bg-card">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/80 sticky top-0 backdrop-blur">
                      <tr>
                        <th className="text-start p-2 font-semibold">{isAr ? "العمود" : "Column"}</th>
                        <th className="text-end p-2 font-semibold">{isAr ? "أدنى" : "Min"}</th>
                        <th className="text-end p-2 font-semibold text-primary">{isAr ? "متوسط" : "Avg"}</th>
                        <th className="text-end p-2 font-semibold">{isAr ? "أعلى" : "Max"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {numericColumns.map((col) => {
                        const s = allStats[col];
                        const isActive = col === analyzeColumn;
                        return (
                          <tr
                            key={col}
                            className={`border-t cursor-pointer transition-colors ${
                              isActive
                                ? "bg-primary/10 hover:bg-primary/15"
                                : "hover:bg-accent/60"
                            }`}
                            onClick={() => setAnalyzeColumn(col)}
                          >
                            <td
                              className={`p-2 truncate max-w-[140px] ${
                                isActive ? "font-bold text-primary" : "font-medium"
                              }`}
                              title={col}
                            >
                              {isActive && "▸ "}
                              {col}
                            </td>
                            <td className="p-2 text-end font-mono" title={String(s.min)}>
                              {fmtNum(s.min)}
                            </td>
                            <td
                              className={`p-2 text-end font-mono ${
                                isActive ? "text-primary font-bold" : ""
                              }`}
                              title={String(s.avg)}
                            >
                              {fmtNum(s.avg)}
                            </td>
                            <td className="p-2 text-end font-mono" title={String(s.max)}>
                              {fmtNum(s.max)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            )}

            {/* عرض الصفوف */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRows((s) => !s)}
                className="w-full gap-2"
              >
                <Eye className="w-4 h-4" />
                {showRows
                  ? isAr
                    ? "إخفاء البيانات"
                    : "Hide data"
                  : isAr
                  ? `عرض البيانات (${fmtNum(data.total ?? data.rows.length)} صف)`
                  : `Show data (${fmtNum(data.total ?? data.rows.length)} rows)`}
              </Button>
              {showRows && dataset.columns && (
                <div className="max-h-80 overflow-auto rounded-lg border bg-card">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/80 sticky top-0 backdrop-blur">
                      <tr>
                        {dataset.columns.map((c) => (
                          <th key={c} className="text-start p-2 whitespace-nowrap font-semibold">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.slice(0, 100).map((row, idx) => (
                        <tr key={row.id} className={`border-t ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                          {dataset.columns!.map((c) => (
                            <td key={c} className="p-2 whitespace-nowrap font-mono">
                              {String(row.data?.[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.rows.length > 100 && (
                    <div className="p-2 text-xs text-center text-muted-foreground bg-muted/50 border-t">
                      {isAr
                        ? `عرض 100 من ${fmtNum(data.rows.length)}. افتح الملف كاملاً للمزيد.`
                        : `Showing 100 of ${fmtNum(data.rows.length)}. Open full dataset for more.`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {numericColumns.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6 rounded-md border bg-muted/30">
                {isAr ? "لا توجد أعمدة رقمية في هذا الملف" : "No numeric columns"}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CompareDatasetsPage() {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [panels, setPanels] = useState<(number | null)[]>([null, null]);

  useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.datasets || [];
        setDatasets(list);
      })
      .catch(() => {});
  }, []);

  const addPanel = () => {
    if (panels.length < 4) setPanels([...panels, null]);
  };

  const removePanel = (idx: number) => {
    if (panels.length <= 1) {
      setPanels([null]);
    } else {
      setPanels(panels.filter((_, i) => i !== idx));
    }
  };

  const setPanel = (idx: number, id: number) => {
    const next = [...panels];
    next[idx] = id;
    setPanels(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-primary" />
            {isAr ? "مقارنة الملفات" : "Compare Datasets"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAr
              ? "اختر ملفين أو أكثر — لكل ملف فلاتر متقدمة وإحصائيات ورسم بياني"
              : "Pick 2+ datasets — each has advanced filters, stats, and a chart"}
          </p>
        </div>
        <Button onClick={addPanel} disabled={panels.length >= 4} variant="outline" className="gap-1">
          <span className="text-base leading-none">+</span>
          {isAr ? "إضافة عمود" : "Add column"}
          <span className="text-xs text-muted-foreground">({panels.length}/4)</span>
        </Button>
      </div>

      <div
        className={`grid gap-4 ${
          panels.length === 1
            ? "grid-cols-1"
            : panels.length === 2
            ? "grid-cols-1 lg:grid-cols-2"
            : panels.length === 3
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
        }`}
      >
        {panels.map((dsId, idx) => (
          <DatasetPanel
            key={idx}
            dsId={dsId}
            onChange={(id) => setPanel(idx, id)}
            onRemove={() => removePanel(idx)}
            datasets={datasets}
            isAr={isAr}
            panelNumber={idx + 1}
          />
        ))}
      </div>
    </div>
  );
}
