import { useContext, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { BarChart3, PieChart as PieIcon } from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

interface ChartPanelProps {
  datasetId: number;
  columns: string[];
}

type Agg = "count" | "sum" | "avg" | "min" | "max";
type ChartType = "bar" | "pie";

const COLORS = [
  "hsl(173, 70%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 70%, 60%)",
  "hsl(0, 84%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(330, 81%, 60%)",
  "hsl(199, 89%, 48%)",
  "hsl(48, 96%, 53%)",
  "hsl(263, 70%, 50%)",
];

export default function ChartPanel({ datasetId, columns }: ChartPanelProps) {
  const { t, lang } = useContext(LangContext);
  const [labelColumn, setLabelColumn] = useState(columns[0] || "");
  const [aggregation, setAggregation] = useState<Agg>("count");
  const [valueColumn, setValueColumn] = useState<string>(columns[0] || "");
  const [topN, setTopN] = useState(15);
  const [chartType, setChartType] = useState<ChartType>("bar");

  const chart = useMutation({
    mutationFn: async () => {
      const body: any = {
        labelColumn,
        aggregation,
        topN,
      };
      if (aggregation !== "count") body.valueColumn = valueColumn;
      const res = await apiRequest("POST", `/api/datasets/${datasetId}/chart`, body);
      return res.json() as Promise<{ labels: string[]; values: number[]; total: number }>;
    },
  });

  const chartData =
    chart.data?.labels.map((label, i) => ({
      label,
      value: chart.data!.values[i],
    })) ?? [];

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-2">
          <BarChart3 className="w-5 h-5 mt-0.5 text-primary" />
          <div>
            <h2 className="text-base font-semibold">{t.chart.title}</h2>
            <p className="text-sm text-muted-foreground">{t.chart.desc}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t.chart.labelColumn}</Label>
            <Select value={labelColumn} onValueChange={setLabelColumn}>
              <SelectTrigger data-testid="select-chart-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.pivot.aggregation}</Label>
            <Select value={aggregation} onValueChange={(v) => setAggregation(v as Agg)}>
              <SelectTrigger data-testid="select-chart-agg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">{t.pivot.agg.count}</SelectItem>
                <SelectItem value="sum">{t.pivot.agg.sum}</SelectItem>
                <SelectItem value="avg">{t.pivot.agg.avg}</SelectItem>
                <SelectItem value="min">{t.pivot.agg.min}</SelectItem>
                <SelectItem value="max">{t.pivot.agg.max}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {aggregation !== "count" && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t.pivot.valueColumn}</Label>
              <Select value={valueColumn} onValueChange={setValueColumn}>
                <SelectTrigger data-testid="select-chart-value">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">{t.pivot.topN}</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={topN}
              onChange={(e) =>
                setTopN(Math.max(1, Math.min(100, parseInt(e.target.value) || 15)))
              }
              data-testid="input-chart-topn"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.chart.type}</Label>
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger data-testid="select-chart-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">{t.chart.bar}</SelectItem>
                <SelectItem value="pie">{t.chart.pie}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={() => chart.mutate()} disabled={chart.isPending} data-testid="button-chart-compute">
          {chartType === "bar" ? (
            <BarChart3 className="w-4 h-4 me-2" />
          ) : (
            <PieIcon className="w-4 h-4 me-2" />
          )}
          {t.chart.compute}
        </Button>

        {chart.isPending && (
          <div className="text-sm text-muted-foreground">{t.common.loading}</div>
        )}

        {chart.data ? (
          chart.data.labels.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {t.pivot.empty}
            </div>
          ) : (
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      formatter={(v: any) =>
                        Number(v).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")
                      }
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={160}
                      label={(entry: any) =>
                        `${entry.label}: ${Number(entry.value).toLocaleString(
                          lang === "ar" ? "ar-EG" : "en-US"
                        )}`
                      }
                    >
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      formatter={(v: any) =>
                        Number(v).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")
                      }
                    />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          )
        ) : (
          <div className="text-sm text-muted-foreground py-6 text-center">
            {t.chart.empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
