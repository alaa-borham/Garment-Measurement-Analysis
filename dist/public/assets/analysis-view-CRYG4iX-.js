import { c as createLucideIcon, u as useLocation, r as reactExports, L as LangContext, j as jsxRuntimeExports, C as Card, a as CardContent, R as Ruler, B as Button, F as FileSpreadsheet, X, b as ResultsTable, E as ExcelJS, e as extractNumber, f as fmt, d as colorForDiff } from "./index-klzEDF9_.js";
const Printer = createLucideIcon("Printer", [
  [
    "path",
    {
      d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
      key: "143wyd"
    }
  ],
  ["path", { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6", key: "1itne7" }],
  ["rect", { x: "6", y: "14", width: "12", height: "8", rx: "1", key: "1ue0tg" }]
]);
const Radio = createLucideIcon("Radio", [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
]);
function cssColorToArgb(color) {
  if (!color || color === "transparent" || color === "inherit") return null;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    const computed = ctx.fillStyle;
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
  } catch {
  }
  return null;
}
const NEG_INF_SENTINEL = -1e308;
function buildExportCells(snap) {
  const c = snap.computed;
  if (!c) return { headers: [], rows: [] };
  const L = snap.L || {};
  const labels = snap.rowLabels || {};
  const bands = snap.bands || [];
  const labelOf = (r) => labels[r.id] ?? String(r.id);
  const HEADER_BG = "FF15A077";
  const HEADER_FG = "FFFFFFFF";
  const LABEL_BG = "FFF3F4F6";
  const LABEL_FG = "FF111827";
  const makeHeader = (txt) => ({
    value: txt,
    bg: HEADER_BG,
    fg: HEADER_FG,
    bold: true,
    align: "center"
  });
  const makeLabel = (txt) => ({
    value: txt,
    bg: LABEL_BG,
    fg: LABEL_FG,
    bold: true,
    align: "center"
  });
  const makeDiffCell = (diff, display) => {
    if (isNaN(diff)) {
      return { value: display, align: "center" };
    }
    const { bg, fg } = colorForDiff(diff, bands);
    const bgArgb = cssColorToArgb(bg) || void 0;
    const fgArgb = cssColorToArgb(fg) || void 0;
    return { value: display, bg: bgArgb, fg: fgArgb, align: "center" };
  };
  if (c.mode === "two-rows" && c.rowA && c.rowB) {
    const headers = [
      makeHeader(L.column || "Column"),
      makeHeader(labelOf(c.rowA)),
      makeHeader(labelOf(c.rowB)),
      makeHeader(L.diff || "Diff")
    ];
    const rows = c.cols.map((col) => {
      const a = extractNumber(c.rowA.data[col]);
      const b = extractNumber(c.rowB.data[col]);
      const diff = !isNaN(a) && !isNaN(b) ? b - a : NaN;
      return [
        makeLabel(col),
        { value: isNaN(a) ? String(c.rowA.data[col] ?? "") : a, align: "center" },
        { value: isNaN(b) ? String(c.rowB.data[col] ?? "") : b, align: "center" },
        makeDiffCell(diff, isNaN(diff) ? "" : fmt(diff))
      ];
    });
    return { headers, rows };
  }
  if (c.mode === "matrix") {
    const ref = c.matrixRef ?? "first";
    const headers = [
      makeHeader(L.row || "Row"),
      ...c.cols.map((col) => makeHeader(col))
    ];
    const rows = c.rows.map((r, i) => {
      const cells = [makeLabel(labelOf(r))];
      c.cols.forEach((col) => {
        const v = extractNumber(r.data[col]);
        if (ref === "raw") {
          cells.push({
            value: isNaN(v) ? String(r.data[col] ?? "") : v,
            align: "center"
          });
          return;
        }
        if (i === 0) {
          cells.push({
            value: isNaN(v) ? String(r.data[col] ?? "") : v,
            bold: true,
            align: "center"
          });
          return;
        }
        const base = ref === "first" ? extractNumber(c.rows[0].data[col]) : extractNumber(c.rows[i - 1].data[col]);
        const diff = !isNaN(base) && !isNaN(v) ? v - base : NaN;
        const display = isNaN(diff) ? "" : `${fmt(diff)} (${v})`;
        cells.push(makeDiffCell(diff, display));
      });
      return cells;
    });
    return { headers, rows };
  }
  if (c.mode === "sequential") {
    const headers = [
      makeHeader(L.row || "Row"),
      ...c.cols.map((col) => makeHeader(col))
    ];
    const rows = c.rows.map((r, i) => {
      const cells = [makeLabel(labelOf(r))];
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
function AnalysisViewPage() {
  const [location] = useLocation();
  const { lang: globalLang } = reactExports.useContext(LangContext);
  const tableContainerRef = reactExports.useRef(null);
  const channelId = reactExports.useMemo(() => {
    const qIdx = location.indexOf("?");
    if (qIdx === -1) return null;
    const params = new URLSearchParams(location.slice(qIdx + 1));
    return params.get("ch");
  }, [location]);
  const [snapshot, setSnapshot] = reactExports.useState(null);
  const [mainClosed, setMainClosed] = reactExports.useState(false);
  const [lastUpdate, setLastUpdate] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (!channelId) return;
    const handleSnapshot = (data) => {
      if (data?.type === "snapshot") {
        const fixedBands = (data.bands || []).map((b) => ({
          ...b,
          minDiff: b.minDiff <= NEG_INF_SENTINEL ? -Infinity : b.minDiff
        }));
        setSnapshot({ ...data, bands: fixedBands });
        setMainClosed(false);
        setLastUpdate(Date.now());
      } else if (data?.type === "main-closed") {
        setMainClosed(true);
      }
    };
    const onMessage = (e) => handleSnapshot(e.data);
    window.addEventListener("message", onMessage);
    const sendReady = () => {
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "ready", channel: channelId }, "*");
        }
      } catch {
      }
    };
    sendReady();
    const t1 = setTimeout(sendReady, 200);
    const t2 = setTimeout(sendReady, 1e3);
    let ch = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        ch = new BroadcastChannel(channelId);
        ch.onmessage = (e) => handleSnapshot(e.data);
        ch.postMessage({ type: "ready" });
        setTimeout(() => {
          try {
            ch?.postMessage({ type: "ping" });
          } catch {
          }
        }, 300);
      } catch {
        ch = null;
      }
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("message", onMessage);
      try {
        ch?.close();
      } catch {
      }
    };
  }, [channelId]);
  const effLang = snapshot?.lang ?? globalLang;
  reactExports.useEffect(() => {
    document.documentElement.dir = effLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = effLang;
  }, [effLang]);
  const isAr = effLang === "ar";
  const L = snapshot?.L ?? {};
  const rowLabel = (r) => {
    if (snapshot?.rowLabels && snapshot.rowLabels[r.id] !== void 0) {
      return snapshot.rowLabels[r.id];
    }
    return isAr ? `صف ${r.id}` : `Row ${r.id}`;
  };
  reactExports.useEffect(() => {
    document.title = isAr ? "نتيجة التحليل — قياسات" : "Analysis Result — Qiyasat";
  }, [isAr]);
  const exportExcel = async () => {
    if (!snapshot || !snapshot.computed) return;
    const { headers, rows } = buildExportCells(snapshot);
    const wb = new ExcelJS.Workbook();
    const sheetName = isAr ? "تحليل" : "Analysis";
    const ws = wb.addWorksheet(sheetName, {
      views: [{ rightToLeft: isAr }]
    });
    const applyCell = (cell, c) => {
      cell.value = c.value;
      if (c.bg) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: c.bg }
        };
      }
      cell.font = {
        name: "Arial",
        size: 11,
        bold: !!c.bold,
        color: c.fg ? { argb: c.fg } : void 0
      };
      cell.alignment = {
        horizontal: c.align || "center",
        vertical: "middle",
        wrapText: true
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFAAAAAA" } },
        left: { style: "thin", color: { argb: "FFAAAAAA" } },
        right: { style: "thin", color: { argb: "FFAAAAAA" } },
        bottom: { style: "thin", color: { argb: "FFAAAAAA" } }
      };
    };
    const headerRow = ws.addRow(headers.map((h) => h.value));
    headerRow.height = 24;
    headers.forEach((h, i) => applyCell(headerRow.getCell(i + 1), h));
    rows.forEach((r) => {
      const row = ws.addRow(r.map((c) => c.value));
      row.height = 22;
      r.forEach((cell, i) => applyCell(row.getCell(i + 1), cell));
    });
    headers.forEach((_, i) => {
      let maxLen = String(headers[i]?.value ?? "").length;
      rows.forEach((r) => {
        const v = String(r[i]?.value ?? "");
        if (v.length > maxLen) maxLen = v.length;
      });
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 4, 10), 40);
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = isAr ? `نتيجة-تحليل-${ts}.xlsx` : `analysis-${ts}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  };
  const handlePrint = () => {
    window.print();
  };
  if (!channelId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-background text-foreground flex items-center justify-center p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-6 text-sm text-destructive", children: isAr ? "رابط غير صالح" : "Invalid link" }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "border-b border-border bg-sidebar sticky top-0 z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4 no-print", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ruler, { className: "w-4 h-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "leading-tight", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-sm", children: isAr ? "نتيجة التحليل" : "Analysis Result" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: isAr ? "قياسات — نافذة مستقلة" : "Qiyasat — Standalone window" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
        snapshot?.computed && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outline",
              size: "sm",
              onClick: exportExcel,
              className: "h-8 gap-1.5",
              "data-testid": "button-export-excel",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "w-3.5 h-3.5" }),
                isAr ? "تصدير Excel" : "Export Excel"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outline",
              size: "sm",
              onClick: handlePrint,
              className: "h-8 gap-1.5",
              "data-testid": "button-print",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "w-3.5 h-3.5" }),
                isAr ? "طباعة" : "Print"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1 h-5 w-px bg-border" })
        ] }),
        mainClosed ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-3 h-3" }),
          L.closed ?? (isAr ? "تم إغلاق النافذة الأصلية" : "Main window closed")
        ] }) : snapshot ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { className: "w-3 h-3 animate-pulse" }),
          L.liveSync ?? (isAr ? "مزامنة مباشرة" : "Live sync")
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: L.waitingForData ?? (isAr ? "بانتظار البيانات..." : "Waiting...") })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "max-w-7xl mx-auto px-6 py-6 print-main", ref: tableContainerRef, children: !snapshot || !snapshot.computed ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-10 text-center text-muted-foreground text-sm", children: L.waitingForData ?? (isAr ? "بانتظار البيانات من النافذة الأصلية..." : "Waiting for data from main window...") }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "print-card", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      ResultsTable,
      {
        computed: snapshot.computed,
        bands: snapshot.bands,
        rowLabel,
        L: snapshot.L
      },
      lastUpdate
    ) }) }) })
  ] });
}
export {
  AnalysisViewPage as default
};
//# sourceMappingURL=analysis-view-CRYG4iX-.js.map
