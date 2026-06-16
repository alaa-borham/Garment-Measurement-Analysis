import { useState, useEffect, useContext, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitCompare, X, ExternalLink, BarChart3, Eye } from "lucide-react";
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

  // الأعمدة الرقمية فقط
  const numericColumns = useMemo(() => Object.keys(allStats), [allStats]);

  // افتراضياً اختر أول عمود رقمي للتحليل
  useEffect(() => {
    if (!analyzeColumn && numericColumns.length > 0) {
      setAnalyzeColumn(numericColumns[0]);
    }
  }, [numericColumns, analyzeColumn]);

  // جلب stats مفصّلة من الخادم للعمود المحدد
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

  // بيانات الرسم البياني للعمود المحدد (Histogram مبسّط - 10 خانات)
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
        range: `${(min + i * step).toFixed(1)}`,
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

  const ds = datasets.find((d) => d.id === dsId);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="shrink-0">#{panelNumber}</Badge>
          <select
            value={dsId || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 px-3 py-2 text-sm rounded-md border bg-background min-w-0"
          >
            <option value="">{isAr ? "اختر ملفاً..." : "Select dataset..."}</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
        {dataset && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="text-muted-foreground truncate" title={dataset.fileName}>
              {dataset.fileName} · {data?.total ?? dataset.rowsCount ?? 0} {isAr ? "صف" : "rows"}
            </div>
            <Link
              href={`/datasets/${dataset.id}`}
              className="text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
              {isAr ? "فتح كامل" : "Open"}
            </Link>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {!dsId && (
          <div className="text-center text-sm text-muted-foreground py-12">
            {isAr ? "اختر ملفاً من القائمة أعلاه" : "Select a dataset from above"}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {!loading && dataset && data && (
          <>
            {/* اختيار عمود للتحليل */}
            {numericColumns.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {isAr ? "اختر عموداً للتحليل:" : "Analyze column:"}
                </label>
                <select
                  value={analyzeColumn}
                  onChange={(e) => setAnalyzeColumn(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
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
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <div className="text-sm font-semibold flex items-center justify-between">
                  <span>{analyzeColumn}</span>
                  {statsLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                </div>
                {columnStats ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <StatBox label={isAr ? "العدد" : "Count"} value={columnStats.count} />
                    <StatBox label={isAr ? "المجموع" : "Sum"} value={columnStats.sum?.toFixed(2)} />
                    <StatBox label={isAr ? "الأدنى" : "Min"} value={columnStats.min?.toFixed(2)} />
                    <StatBox label={isAr ? "الأعلى" : "Max"} value={columnStats.max?.toFixed(2)} />
                    <StatBox label={isAr ? "المتوسط" : "Avg"} value={columnStats.avg?.toFixed(2)} highlight />
                    <StatBox label={isAr ? "الوسيط" : "Median"} value={columnStats.median?.toFixed(2)} />
                    <StatBox
                      label={isAr ? "الانحراف" : "Std Dev"}
                      value={columnStats.stdDev?.toFixed(2)}
                      colSpan
                    />
                  </div>
                ) : allStats[analyzeColumn] ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <StatBox label={isAr ? "العدد" : "Count"} value={allStats[analyzeColumn].count} />
                    <StatBox label={isAr ? "المجموع" : "Sum"} value={allStats[analyzeColumn].sum.toFixed(2)} />
                    <StatBox label={isAr ? "الأدنى" : "Min"} value={allStats[analyzeColumn].min.toFixed(2)} />
                    <StatBox label={isAr ? "الأعلى" : "Max"} value={allStats[analyzeColumn].max.toFixed(2)} />
                    <StatBox
                      label={isAr ? "المتوسط" : "Avg"}
                      value={allStats[analyzeColumn].avg.toFixed(2)}
                      highlight
                      colSpan
                    />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">{isAr ? "لا توجد بيانات" : "No data"}</div>
                )}
              </div>
            )}

            {/* رسم بياني (Histogram) */}
            {histogramData.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">
                  {isAr ? "توزيع القيم" : "Value distribution"}
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* جدول كل الإحصائيات الرقمية */}
            {numericColumns.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">
                  {isAr ? "ملخص كل الأعمدة الرقمية" : "All numeric columns"}
                </div>
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-start p-2">{isAr ? "العمود" : "Column"}</th>
                        <th className="text-end p-2">{isAr ? "أدنى" : "Min"}</th>
                        <th className="text-end p-2">{isAr ? "متوسط" : "Avg"}</th>
                        <th className="text-end p-2">{isAr ? "أعلى" : "Max"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {numericColumns.map((col) => {
                        const s = allStats[col];
                        return (
                          <tr
                            key={col}
                            className={`border-t cursor-pointer hover:bg-accent ${
                              col === analyzeColumn ? "bg-accent" : ""
                            }`}
                            onClick={() => setAnalyzeColumn(col)}
                          >
                            <td className="p-2 font-medium truncate max-w-[120px]" title={col}>
                              {col}
                            </td>
                            <td className="p-2 text-end font-mono">{s.min.toFixed(1)}</td>
                            <td className="p-2 text-end font-mono">{s.avg.toFixed(1)}</td>
                            <td className="p-2 text-end font-mono">{s.max.toFixed(1)}</td>
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
                  ? `عرض البيانات (${data.total ?? data.rows.length} صف)`
                  : `Show data (${data.total ?? data.rows.length} rows)`}
              </Button>
              {showRows && dataset.columns && (
                <div className="max-h-80 overflow-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {dataset.columns.map((c) => (
                          <th key={c} className="text-start p-2 whitespace-nowrap font-semibold">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.slice(0, 100).map((row) => (
                        <tr key={row.id} className="border-t">
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
                    <div className="p-2 text-xs text-center text-muted-foreground bg-muted/50">
                      {isAr
                        ? `عرض 100 من ${data.rows.length}. افتح الملف كاملاً للمزيد.`
                        : `Showing 100 of ${data.rows.length}. Open full dataset for more.`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {numericColumns.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                {isAr ? "لا توجد أعمدة رقمية في هذا الملف" : "No numeric columns in this dataset"}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({
  label,
  value,
  highlight,
  colSpan,
}: {
  label: string;
  value: string | number | undefined;
  highlight?: boolean;
  colSpan?: boolean;
}) {
  return (
    <div
      className={`rounded p-2 ${
        highlight ? "bg-primary/10 border border-primary/30" : "bg-background border"
      } ${colSpan ? "col-span-2" : ""}`}
    >
      <div className="text-muted-foreground">{label}</div>
      <div className={`font-mono font-bold ${highlight ? "text-primary" : ""}`}>
        {value ?? "—"}
      </div>
    </div>
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
            <GitCompare className="w-6 h-6" />
            {isAr ? "مقارنة الملفات" : "Compare Datasets"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAr
              ? "اختر ملفين أو أكثر — لكل ملف تظهر إحصائيات ورسم بياني وعرض للبيانات"
              : "Pick 2+ datasets — each shows stats, chart, and data view"}
          </p>
        </div>
        <Button onClick={addPanel} disabled={panels.length >= 4} variant="outline">
          {isAr ? "+ إضافة عمود" : "+ Add column"}
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
