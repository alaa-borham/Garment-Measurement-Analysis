import { useState, useEffect, useContext, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitCompare, X, ExternalLink, BarChart3, Eye, TrendingUp } from "lucide-react";
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

  // تحميل تفاصيل الملف + الصفوف
  useEffect(() => {
    if (!dsId) {
      setDataset(null);
      setData(null);
      setColumnStats(null);
      setAnalyzeColumn("");
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/datasets/${dsId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/datasets/${dsId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, pageSize: 1000, conditions: [], logic: "AND" }),
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
  }, [dsId]);

  // حساب الإحصائيات لكل الأعمدة الرقمية
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

  useEffect(() => {
    if (!dsId || !analyzeColumn) {
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
  }, [dsId, analyzeColumn]);

  // Histogram - 10 خانات
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
                <div className="text-sm font-bold flex items-center justify-between border-b border-primary/20 pb-2">
                  <span className="flex items-center gap-1.5 truncate">
                    <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate" title={analyzeColumn}>{analyzeColumn}</span>
                  </span>
                  {statsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
                </div>

                {columnStats ? (
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
                )}
              </div>
            )}

            {/* رسم بياني (Histogram) */}
            {histogramData.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                  <span>{isAr ? "توزيع القيم" : "Distribution"}</span>
                  <span className="text-[10px] font-normal normal-case">
                    {isAr ? "10 فترات" : "10 bins"}
                  </span>
                </div>
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
              </div>
            )}

            {/* جدول كل الإحصائيات الرقمية */}
            {numericColumns.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                  <span>{isAr ? "كل الأعمدة الرقمية" : "All numeric columns"}</span>
                  <span className="text-[10px] font-normal normal-case">
                    {isAr ? "اضغط للتحليل" : "Click to analyze"}
                  </span>
                </div>
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
              ? "اختر ملفين أو أكثر — لكل ملف إحصائيات ورسم بياني وعرض للبيانات"
              : "Pick 2+ datasets — each shows stats, chart, and data view"}
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
