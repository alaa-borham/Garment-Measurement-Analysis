import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ruler, Radio, X, FileSpreadsheet, Printer } from "lucide-react";
import ExcelJS from "exceljs";
import { LangContext } from "@/lib/i18n";
import {
  ResultsTable,
  extractNumber,
  fmt,
  colorForDiff,
  type ComputedShape,
  type ColorBand,
  type Row,
} from "@/components/compare-panel";

// تحويل لون CSS (hsl/rgb/hex) إلى ARGB hex لـ ExcelJS
function cssColorToArgb(color: string): string | null {
  if (!color || color === "transparent" || color === "inherit") return null;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    const computed = ctx.fillStyle as string;
    // computed سيكون #rrggbb أو rgba(...)
    if (computed.startsWith("#")) {
      return "FF" + computed.slice(1).toUpperCase().padStart(6, "0");
    }
    const m = computed.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
      const r = Math.round(parts[0]).toString(16).padStart(2, "0");
      const g = Math.round(parts[1]).toString(16).padStart(2, "0");
      const b = Math.round(parts[2]).toString(16).padStart(2, "0");
      return ("FF" + r + g + b).toUpperCase();
    }
  } catch {}
  return null;
}

interface ExportCell {
  value: string | number;
  bg?: string; // ARGB
  fg?: string; // ARGB
  bold?: boolean;
  align?: "left" | "center" | "right";
}

// قيمة sentinel لاستبدال -Infinity بعد التسلسل عبر BroadcastChannel
const NEG_INF_SENTINEL = -1e308;

interface Snapshot {
  type: "snapshot";
  computed: ComputedShape | null;
  bands: ColorBand[];
  rowLabels: Record<number, string>;
  lang: "ar" | "en";
  L: any;
}

// بناء مصفوفة خلايا منسّقة (مع ألوان) للتصدير
function buildExportCells(snap: Snapshot): {
  headers: ExportCell[];
  rows: ExportCell[][];
} {
  const c = snap.computed;
  if (!c) return { headers: [], rows: [] };
  const L = snap.L || {};
  const labels = snap.rowLabels || {};
  const bands = snap.bands || [];
  const labelOf = (r: Row) => labels[r.id] ?? String(r.id);

  // لون رأس الجدول: لون primary تقريباً (أخضر داكن)
  const HEADER_BG = "FF15A077";
  const HEADER_FG = "FFFFFFFF";
  // لون عمود التسميات
  const LABEL_BG = "FFF3F4F6";
  const LABEL_FG = "FF111827";

  const makeHeader = (txt: string): ExportCell => ({
    value: txt,
    bg: HEADER_BG,
    fg: HEADER_FG,
    bold: true,
    align: "center",
  });
  const makeLabel = (txt: string): ExportCell => ({
    value: txt,
    bg: LABEL_BG,
    fg: LABEL_FG,
    bold: true,
    align: "center",
  });
  const makeDiffCell = (diff: number, display: string | number): ExportCell => {
    if (isNaN(diff)) {
      return { value: display, align: "center" };
    }
    const { bg, fg } = colorForDiff(diff, bands);
    const bgArgb = cssColorToArgb(bg) || undefined;
    const fgArgb = cssColorToArgb(fg) || undefined;
    return { value: display, bg: bgArgb, fg: fgArgb, align: "center" };
  };

  if (c.mode === "two-rows" && c.rowA && c.rowB) {
    const headers: ExportCell[] = [
      makeHeader(L.column || "Column"),
      makeHeader(labelOf(c.rowA)),
      makeHeader(labelOf(c.rowB)),
      makeHeader(L.diff || "Diff"),
    ];
    const rows = c.cols.map((col): ExportCell[] => {
      const a = extractNumber(c.rowA!.data[col]);
      const b = extractNumber(c.rowB!.data[col]);
      const diff = !isNaN(a) && !isNaN(b) ? b - a : NaN;
      return [
        makeLabel(col),
        { value: isNaN(a) ? String(c.rowA!.data[col] ?? "") : a, align: "center" },
        { value: isNaN(b) ? String(c.rowB!.data[col] ?? "") : b, align: "center" },
        makeDiffCell(diff, isNaN(diff) ? "" : fmt(diff)),
      ];
    });
    return { headers, rows };
  }

  if (c.mode === "matrix") {
    const ref = c.matrixRef ?? "first";
    const headers: ExportCell[] = [
      makeHeader(L.row || "Row"),
      ...c.cols.map((col) => makeHeader(col)),
    ];
    const rows = c.rows.map((r, i): ExportCell[] => {
      const cells: ExportCell[] = [makeLabel(labelOf(r))];
      c.cols.forEach((col) => {
        const v = extractNumber(r.data[col]);
        if (ref === "raw") {
          cells.push({
            value: isNaN(v) ? String(r.data[col] ?? "") : v,
            align: "center",
          });
          return;
        }
        if (i === 0) {
          cells.push({
            value: isNaN(v) ? String(r.data[col] ?? "") : v,
            bold: true,
            align: "center",
          });
          return;
        }
        const base =
          ref === "first"
            ? extractNumber(c.rows[0].data[col])
            : extractNumber(c.rows[i - 1].data[col]);
        const diff = !isNaN(base) && !isNaN(v) ? v - base : NaN;
        const display = isNaN(diff) ? "" : `${fmt(diff)} (${v})`;
        cells.push(makeDiffCell(diff, display));
      });
      return cells;
    });
    return { headers, rows };
  }

  if (c.mode === "sequential") {
    const headers: ExportCell[] = [
      makeHeader(L.row || "Row"),
      ...c.cols.map((col) => makeHeader(col)),
    ];
    const rows = c.rows.map((r, i): ExportCell[] => {
      const cells: ExportCell[] = [makeLabel(labelOf(r))];
      c.cols.forEach((col) => {
        if (i === 0) {
          cells.push({ value: "—", align: "center" });
          return;
        }
        const prev = extractNumber(c.rows[i - 1].data[col]);
        const curr = extractNumber(r.data[col]);
        const diff = !isNaN(prev) && !isNaN(curr) ? curr - prev : NaN;
        cells.push(makeDiffCell(diff, isNaN(diff) ? "" : fmt(diff)));
      });
      return cells;
    });
    return { headers, rows };
  }
  return { headers: [], rows: [] };
}

export default function AnalysisViewPage() {
  const [location] = useLocation();
  const { lang: globalLang } = useContext(LangContext);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // قراءة معرف القناة من query string في hash
  const channelId = useMemo(() => {
    // location عبارة عن "/analysis-view?ch=..." بفضل useHashLocation
    const qIdx = location.indexOf("?");
    if (qIdx === -1) return null;
    const params = new URLSearchParams(location.slice(qIdx + 1));
    return params.get("ch");
  }, [location]);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [mainClosed, setMainClosed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    if (!channelId) return;

    const handleSnapshot = (data: any) => {
      if (data?.type === "snapshot") {
        const fixedBands: ColorBand[] = (data.bands || []).map((b: ColorBand) => ({
          ...b,
          minDiff: b.minDiff <= NEG_INF_SENTINEL ? -Infinity : b.minDiff,
        }));
        setSnapshot({ ...data, bands: fixedBands });
        setMainClosed(false);
        setLastUpdate(Date.now());
      } else if (data?.type === "main-closed") {
        setMainClosed(true);
      }
    };

    // 1) postMessage من النافذة الأصلية (يعمل عبر origins مختلفة)
    const onMessage = (e: MessageEvent) => handleSnapshot(e.data);
    window.addEventListener("message", onMessage);

    // أرسل ready لـ opener (إن وجد)
    const sendReady = () => {
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "ready", channel: channelId }, "*");
        }
      } catch {}
    };
    sendReady();
    const t1 = setTimeout(sendReady, 200);
    const t2 = setTimeout(sendReady, 1000);

    // 2) BroadcastChannel كاحتياطي (same-origin)
    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        ch = new BroadcastChannel(channelId);
        ch.onmessage = (e) => handleSnapshot(e.data);
        ch.postMessage({ type: "ready" });
        setTimeout(() => { try { ch?.postMessage({ type: "ping" }); } catch {} }, 300);
      } catch {
        ch = null;
      }
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("message", onMessage);
      try { ch?.close(); } catch {}
    };
  }, [channelId]);

  // تطبيق اللغة والاتجاه على هذه النافذة بشكل مستقل
  const effLang = snapshot?.lang ?? globalLang;
  useEffect(() => {
    document.documentElement.dir = effLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = effLang;
  }, [effLang]);

  const isAr = effLang === "ar";
  const L = snapshot?.L ?? {};

  const rowLabel = (r: Row): string => {
    if (snapshot?.rowLabels && snapshot.rowLabels[r.id] !== undefined) {
      return snapshot.rowLabels[r.id];
    }
    return isAr ? `صف ${r.id}` : `Row ${r.id}`;
  };

  // عنوان النافذة
  useEffect(() => {
    document.title = isAr ? "نتيجة التحليل — قياسات" : "Analysis Result — Qiyasat";
  }, [isAr]);

  // تصدير Excel مع ألوان وتنسيقات
  const exportExcel = async () => {
    if (!snapshot || !snapshot.computed) return;
    const { headers, rows } = buildExportCells(snapshot);

    const wb = new ExcelJS.Workbook();
    const sheetName = isAr ? "تحليل" : "Analysis";
    const ws = wb.addWorksheet(sheetName, {
      views: [{ rightToLeft: isAr }],
    });

    const applyCell = (cell: ExcelJS.Cell, c: ExportCell) => {
      cell.value = c.value as any;
      if (c.bg) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: c.bg },
        };
      }
      cell.font = {
        name: "Arial",
        size: 11,
        bold: !!c.bold,
        color: c.fg ? { argb: c.fg } : undefined,
      };
      cell.alignment = {
        horizontal: c.align || "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFAAAAAA" } },
        left: { style: "thin", color: { argb: "FFAAAAAA" } },
        right: { style: "thin", color: { argb: "FFAAAAAA" } },
        bottom: { style: "thin", color: { argb: "FFAAAAAA" } },
      };
    };

    // إضافة صف الترويسة
    const headerRow = ws.addRow(headers.map((h) => h.value));
    headerRow.height = 24;
    headers.forEach((h, i) => applyCell(headerRow.getCell(i + 1), h));

    // إضافة الصفوف
    rows.forEach((r) => {
      const row = ws.addRow(r.map((c) => c.value));
      row.height = 22;
      r.forEach((cell, i) => applyCell(row.getCell(i + 1), cell));
    });

    // عرض أعمدة تلقائي
    headers.forEach((_, i) => {
      let maxLen = String(headers[i]?.value ?? "").length;
      rows.forEach((r) => {
        const v = String(r[i]?.value ?? "");
        if (v.length > maxLen) maxLen = v.length;
      });
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 4, 10), 40);
    });

    // تنزيل
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = isAr ? `نتيجة-تحليل-${ts}.xlsx` : `analysis-${ts}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // طباعة
  const handlePrint = () => {
    window.print();
  };

  if (!channelId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card><CardContent className="p-6 text-sm text-destructive">
          {isAr ? "رابط غير صالح" : "Invalid link"}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-sidebar sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Ruler className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm">
                {isAr ? "نتيجة التحليل" : "Analysis Result"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isAr ? "قياسات — نافذة مستقلة" : "Qiyasat — Standalone window"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {snapshot?.computed && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportExcel}
                  className="h-8 gap-1.5"
                  data-testid="button-export-excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {isAr ? "تصدير Excel" : "Export Excel"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 gap-1.5"
                  data-testid="button-print"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {isAr ? "طباعة" : "Print"}
                </Button>
                <span className="mx-1 h-5 w-px bg-border" />
              </>
            )}
            {mainClosed ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive">
                <X className="w-3 h-3" />
                {L.closed ?? (isAr ? "تم إغلاق النافذة الأصلية" : "Main window closed")}
              </span>
            ) : snapshot ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary">
                <Radio className="w-3 h-3 animate-pulse" />
                {L.liveSync ?? (isAr ? "مزامنة مباشرة" : "Live sync")}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {L.waitingForData ?? (isAr ? "بانتظار البيانات..." : "Waiting...")}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 print-main" ref={tableContainerRef}>
        {!snapshot || !snapshot.computed ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground text-sm">
              {L.waitingForData ?? (isAr ? "بانتظار البيانات من النافذة الأصلية..." : "Waiting for data from main window...")}
            </CardContent>
          </Card>
        ) : (
          <Card className="print-card">
            <CardContent className="p-4">
              <ResultsTable
                key={lastUpdate}
                computed={snapshot.computed}
                bands={snapshot.bands}
                rowLabel={rowLabel}
                L={snapshot.L}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
