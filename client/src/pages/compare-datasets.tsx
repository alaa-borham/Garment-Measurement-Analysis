import { useState, useEffect, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, GitCompare, X } from "lucide-react";
import { LangContext } from "@/lib/i18n";

interface Dataset {
  id: number;
  name: string;
  fileName: string;
  rowsCount?: number;
  columnsCount?: number;
}

interface DatasetData {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

function DatasetPanel({
  dsId,
  onChange,
  onRemove,
  datasets,
  isAr,
}: {
  dsId: number | null;
  onChange: (id: number) => void;
  onRemove: () => void;
  datasets: Dataset[];
  isAr: boolean;
}) {
  const [data, setData] = useState<DatasetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, { min: number; max: number; avg: number; count: number }>>({});

  useEffect(() => {
    if (!dsId) {
      setData(null);
      setStats({});
      return;
    }
    setLoading(true);
    fetch(`/api/datasets/${dsId}/rows?limit=200&offset=0`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        // حساب إحصائيات للأعمدة الرقمية
        const s: Record<string, { min: number; max: number; avg: number; count: number }> = {};
        if (d?.headers && d?.rows) {
          d.headers.forEach((h: string, idx: number) => {
            const nums = d.rows
              .map((row: any[]) => Number(row[idx]))
              .filter((n: number) => !isNaN(n) && isFinite(n));
            if (nums.length > 0) {
              s[h] = {
                min: Math.min(...nums),
                max: Math.max(...nums),
                avg: nums.reduce((a: number, b: number) => a + b, 0) / nums.length,
                count: nums.length,
              };
            }
          });
        }
        setStats(s);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dsId]);

  const ds = datasets.find((d) => d.id === dsId);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <select
            value={dsId || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 px-3 py-2 text-sm rounded-md border bg-background"
          >
            <option value="">{isAr ? "اختر ملفاً..." : "Select dataset..."}</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
        {ds && (
          <div className="text-xs text-muted-foreground mt-1">
            {ds.fileName} · {ds.rowsCount || 0} {isAr ? "صف" : "rows"}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 flex-1">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        {!loading && data && (
          <>
            <div>
              <div className="text-xs font-semibold mb-2">{isAr ? "إحصائيات الأعمدة الرقمية" : "Numeric Column Stats"}</div>
              {Object.keys(stats).length === 0 ? (
                <div className="text-xs text-muted-foreground">{isAr ? "لا توجد أعمدة رقمية" : "No numeric columns"}</div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {Object.entries(stats).map(([col, s]) => (
                    <div key={col} className="text-xs border rounded-md p-2 bg-muted/30">
                      <div className="font-semibold mb-1">{col}</div>
                      <div className="grid grid-cols-3 gap-1 text-muted-foreground">
                        <div>
                          <span className="text-foreground font-mono">{s.min.toFixed(2)}</span>
                          <div>{isAr ? "أدنى" : "Min"}</div>
                        </div>
                        <div>
                          <span className="text-foreground font-mono">{s.avg.toFixed(2)}</span>
                          <div>{isAr ? "متوسط" : "Avg"}</div>
                        </div>
                        <div>
                          <span className="text-foreground font-mono">{s.max.toFixed(2)}</span>
                          <div>{isAr ? "أعلى" : "Max"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold mb-2">{isAr ? "أول 5 صفوف" : "First 5 rows"}</div>
              <div className="text-xs overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      {data.headers.map((h, i) => (
                        <th key={i} className="text-start p-1 font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-b">
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-1 whitespace-nowrap font-mono">
                            {String(cell ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
      .then((d) => setDatasets(d.datasets || d || []))
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare className="w-6 h-6" />
            {isAr ? "مقارنة الملفات" : "Compare Datasets"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAr ? "قارن إحصائيات وبيانات ملفين أو أكثر جنباً إلى جنب" : "Compare datasets side by side"}
          </p>
        </div>
        <Button onClick={addPanel} disabled={panels.length >= 4} variant="outline">
          {isAr ? "إضافة عمود" : "Add column"}
        </Button>
      </div>

      <div className={`grid gap-4 ${
        panels.length === 1 ? "grid-cols-1" :
        panels.length === 2 ? "grid-cols-1 md:grid-cols-2" :
        panels.length === 3 ? "grid-cols-1 md:grid-cols-3" :
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      }`}>
        {panels.map((dsId, idx) => (
          <DatasetPanel
            key={idx}
            dsId={dsId}
            onChange={(id) => setPanel(idx, id)}
            onRemove={() => removePanel(idx)}
            datasets={datasets}
            isAr={isAr}
          />
        ))}
      </div>
    </div>
  );
}
