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
import { Table2, Download } from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

interface PivotPanelProps {
  datasetId: number;
  columns: string[];
}

interface PivotResult {
  rowLabels: string[];
  colLabels: string[];
  matrix: (number | null)[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

type Agg = "count" | "sum" | "avg" | "min" | "max";

const NONE_COL = "__NONE__";

export default function PivotPanel({ datasetId, columns }: PivotPanelProps) {
  const { t, lang } = useContext(LangContext);
  const [rowColumn, setRowColumn] = useState(columns[0] || "");
  const [colColumn, setColColumn] = useState<string>(NONE_COL);
  const [aggregation, setAggregation] = useState<Agg>("count");
  const [valueColumn, setValueColumn] = useState<string>(columns[0] || "");
  const [topN, setTopN] = useState(20);

  const pivot = useMutation({
    mutationFn: async () => {
      const body: any = {
        rowColumn,
        aggregation,
        topN,
      };
      if (colColumn !== NONE_COL) body.colColumn = colColumn;
      if (aggregation !== "count") body.valueColumn = valueColumn;
      const res = await apiRequest("POST", `/api/datasets/${datasetId}/pivot`, body);
      return res.json() as Promise<PivotResult>;
    },
  });

  const fmt = (n: number | null) =>
    n === null
      ? "—"
      : Number(n.toFixed(2)).toLocaleString(lang === "ar" ? "ar-EG" : "en-US");

  const exportCsv = () => {
    if (!pivot.data) return;
    const { rowLabels, colLabels, matrix, rowTotals, colTotals, grandTotal } = pivot.data;
    const showCols = colColumn !== NONE_COL;
    const header = showCols
      ? [rowColumn, ...colLabels, t.pivot.rowTotal]
      : [rowColumn, t.pivot.agg[aggregation]];
    const lines: string[] = [];
    lines.push(header.map(csvEsc).join(","));
    rowLabels.forEach((rl, ri) => {
      const row = showCols
        ? [rl, ...matrix[ri].map((v) => (v === null ? "" : String(v))), String(rowTotals[ri])]
        : [rl, matrix[ri][0] === null ? "" : String(matrix[ri][0])];
      lines.push(row.map(csvEsc).join(","));
    });
    if (showCols) {
      lines.push(
        [t.pivot.colTotal, ...colTotals.map((v) => String(v)), String(grandTotal)]
          .map(csvEsc)
          .join(",")
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pivot_${datasetId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const showCols = colColumn !== NONE_COL;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-2">
          <Table2 className="w-5 h-5 mt-0.5 text-primary" />
          <div>
            <h2 className="text-base font-semibold">{t.pivot.title}</h2>
            <p className="text-sm text-muted-foreground">{t.pivot.desc}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t.pivot.rowColumn}</Label>
            <Select value={rowColumn} onValueChange={setRowColumn}>
              <SelectTrigger data-testid="select-pivot-row">
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
            <Label className="text-xs">{t.pivot.colColumn}</Label>
            <Select value={colColumn} onValueChange={setColColumn}>
              <SelectTrigger data-testid="select-pivot-col">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_COL}>{t.pivot.none}</SelectItem>
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
              <SelectTrigger data-testid="select-pivot-agg">
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
                <SelectTrigger data-testid="select-pivot-value">
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
              max={500}
              value={topN}
              onChange={(e) => setTopN(Math.max(1, Math.min(500, parseInt(e.target.value) || 20)))}
              data-testid="input-pivot-topn"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => pivot.mutate()}
            disabled={pivot.isPending}
            data-testid="button-pivot-compute"
          >
            <Table2 className="w-4 h-4 me-2" />
            {t.pivot.compute}
          </Button>
          {pivot.data && (
            <Button variant="outline" onClick={exportCsv} data-testid="button-pivot-export">
              <Download className="w-4 h-4 me-2" />
              {t.pivot.exportCsv}
            </Button>
          )}
        </div>

        {pivot.isPending && (
          <div className="text-sm text-muted-foreground">{t.common.loading}</div>
        )}

        {pivot.data ? (
          pivot.data.rowLabels.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {t.pivot.empty}
            </div>
          ) : (
            <div className="overflow-auto max-h-[60vh] border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-start p-2 font-medium border-b border-e">
                      {rowColumn}
                    </th>
                    {showCols ? (
                      pivot.data.colLabels.map((cl) => (
                        <th
                          key={cl}
                          className="text-end p-2 font-medium border-b whitespace-nowrap"
                        >
                          {cl}
                        </th>
                      ))
                    ) : (
                      <th className="text-end p-2 font-medium border-b">
                        {t.pivot.agg[aggregation]}
                      </th>
                    )}
                    {showCols && (
                      <th className="text-end p-2 font-medium border-b border-s bg-primary/5">
                        {t.pivot.rowTotal}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pivot.data.rowLabels.map((rl, ri) => (
                    <tr key={rl} className="hover:bg-muted/30">
                      <td className="p-2 font-medium border-b border-e whitespace-nowrap">
                        {rl}
                      </td>
                      {pivot.data!.matrix[ri].map((v, ci) => (
                        <td
                          key={ci}
                          className="text-end p-2 border-b font-mono tabular-nums"
                          style={{
                            background:
                              v !== null && v > 0
                                ? `hsla(173, 70%, 45%, ${Math.min(
                                    0.25,
                                    (v / Math.max(1, pivot.data!.grandTotal)) * 5
                                  )})`
                                : undefined,
                          }}
                        >
                          {fmt(v)}
                        </td>
                      ))}
                      {showCols && (
                        <td className="text-end p-2 border-b border-s font-mono tabular-nums font-semibold bg-primary/5">
                          {fmt(pivot.data!.rowTotals[ri])}
                        </td>
                      )}
                    </tr>
                  ))}
                  {showCols && (
                    <tr className="bg-primary/10 font-semibold">
                      <td className="p-2 border-e">{t.pivot.colTotal}</td>
                      {pivot.data.colTotals.map((v, i) => (
                        <td key={i} className="text-end p-2 font-mono tabular-nums">
                          {fmt(v)}
                        </td>
                      ))}
                      <td className="text-end p-2 border-s font-mono tabular-nums">
                        {fmt(pivot.data.grandTotal)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="text-sm text-muted-foreground py-6 text-center">
            {t.pivot.noResult}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function csvEsc(s: string): string {
  if (s == null) return "";
  const v = String(s);
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}
