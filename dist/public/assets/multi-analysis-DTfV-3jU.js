import { c as createLucideIcon, r as reactExports, L as LangContext, j as jsxRuntimeExports, R as Ruler, aa as LayoutGrid, B as Button, a8 as ExternalLink, C as Card, k as CardHeader, m as Badge, X, a as CardContent, a9 as LoaderCircle, F as FileSpreadsheet } from "./index-klzEDF9_.js";
import { M as Minimize2, a as Maximize2 } from "./minimize-2-BaAladWb.js";
const SquareSplitHorizontal = createLucideIcon("SquareSplitHorizontal", [
  ["path", { d: "M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3", key: "lubmu8" }],
  ["path", { d: "M16 5h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3", key: "1ag34g" }],
  ["line", { x1: "12", x2: "12", y1: "4", y2: "20", key: "1tx1rr" }]
]);
function openInNewTab(id) {
  window.open(`/#/datasets/${id}?tab=compare`, `qiyasat-ds-${id}`);
}
function AnalysisPanelIframe({
  dsId,
  onChange,
  onRemove,
  datasets,
  isAr,
  panelNumber,
  isFullscreen,
  onToggleFullscreen
}) {
  const [dataset, setDataset] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(false);
  const [iframeLoading, setIframeLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (!dsId) {
      setDataset(null);
      return;
    }
    setLoading(true);
    setIframeLoading(true);
    const token = localStorage.getItem("qiyasat_auth_token");
    fetch(`/api/datasets/${dsId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) {
        setDataset({
          id: d.id,
          name: d.name,
          fileName: d.fileName,
          rowsCount: d.rowsCount,
          columns: d.columns
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [dsId]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "flex flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-2 pt-2 space-y-1.5 bg-muted/30 border-b", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "default", className: "shrink-0 text-xs", children: [
          "#",
          panelNumber
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: dsId || "",
            onChange: (e) => onChange(Number(e.target.value)),
            className: "flex-1 px-3 py-1.5 text-sm rounded-md border bg-background min-w-0 focus:ring-2 focus:ring-primary/30 focus:outline-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: isAr ? "اختر ملفاً..." : "Select dataset..." }),
              datasets.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.id, children: d.name }, d.id))
            ]
          }
        ),
        dsId && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            onClick: onToggleFullscreen,
            className: "h-8 w-8 shrink-0",
            title: isFullscreen ? isAr ? "تصغير" : "Minimize" : isAr ? "تكبير" : "Expand",
            children: isFullscreen ? /* @__PURE__ */ jsxRuntimeExports.jsx(Minimize2, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            onClick: onRemove,
            className: "h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-4 h-4" })
          }
        )
      ] }),
      dataset && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-muted-foreground truncate flex-1", title: dataset.fileName, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: dataset.fileName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1", children: "·" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
            (dataset.rowsCount ?? 0).toLocaleString(),
            " ",
            isAr ? "صف" : "rows",
            " · ",
            dataset.columns?.length || 0,
            " ",
            isAr ? "عمود" : "cols"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => openInNewTab(dataset.id),
            className: "text-primary hover:underline flex items-center gap-1 shrink-0 font-medium",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-3 h-3" }),
              isAr ? "تبويب جديد" : "New tab"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `relative bg-background ${isFullscreen ? "h-[calc(100vh-200px)]" : "h-[800px]"}`, children: [
      !dsId && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Ruler, { className: "w-10 h-10 mx-auto mb-2 opacity-30" }),
        isAr ? "اختر ملفاً من القائمة أعلاه" : "Select a dataset"
      ] }),
      loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 animate-spin text-primary" }) }),
      !loading && dataset && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        iframeLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 animate-spin text-primary" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "iframe",
          {
            src: `/#/datasets/${dataset.id}?embed=1&tab=compare`,
            title: dataset.name,
            className: "w-full h-full border-0",
            onLoad: () => setIframeLoading(false)
          },
          dataset.id
        )
      ] })
    ] })
  ] });
}
function DatasetCard({
  dsId,
  onChange,
  onRemove,
  datasets,
  isAr,
  panelNumber
}) {
  const [dataset, setDataset] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!dsId) {
      setDataset(null);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem("qiyasat_auth_token");
    fetch(`/api/datasets/${dsId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) {
        setDataset({
          id: d.id,
          name: d.name,
          fileName: d.fileName,
          rowsCount: d.rowsCount,
          columns: d.columns
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [dsId]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "flex flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2 pt-2 space-y-1.5 bg-muted/30 border-b", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "default", className: "shrink-0 text-xs", children: [
        "#",
        panelNumber
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          value: dsId || "",
          onChange: (e) => onChange(Number(e.target.value)),
          className: "flex-1 px-3 py-1.5 text-sm rounded-md border bg-background min-w-0 focus:ring-2 focus:ring-primary/30 focus:outline-none",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: isAr ? "اختر ملفاً..." : "Select dataset..." }),
            datasets.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.id, children: d.name }, d.id))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "icon",
          onClick: onRemove,
          className: "h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-4 h-4" })
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4 flex-1 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]", children: [
      !dsId && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Ruler, { className: "w-12 h-12 opacity-20" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: isAr ? "اختر ملفاً من القائمة أعلاه" : "Select a dataset above" })
      ] }),
      loading && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 animate-spin text-primary" }),
      !loading && dataset && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "w-10 h-10 text-primary opacity-80" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold text-base truncate max-w-[260px]", title: dataset.name, children: dataset.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate max-w-[260px]", title: dataset.fileName, children: dataset.fileName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs font-mono text-muted-foreground", children: [
            (dataset.rowsCount ?? 0).toLocaleString(),
            " ",
            isAr ? "صف" : "rows",
            " · ",
            dataset.columns?.length || 0,
            " ",
            isAr ? "عمود" : "cols"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            onClick: () => openInNewTab(dataset.id),
            className: "gap-2 mt-2",
            size: "sm",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-4 h-4" }),
              isAr ? "فتح في تبويب جديد" : "Open in new tab"
            ]
          }
        )
      ] })
    ] })
  ] });
}
function MultiAnalysisPage() {
  const { lang } = reactExports.useContext(LangContext);
  const isAr = lang === "ar";
  const [datasets, setDatasets] = reactExports.useState([]);
  const [panels, setPanels] = reactExports.useState([null, null]);
  const [fullscreenIdx, setFullscreenIdx] = reactExports.useState(null);
  const [mode, setMode] = reactExports.useState(() => {
    if (typeof window === "undefined") return "tabs";
    return window.localStorage.getItem("qiyasat-multi-mode") || "tabs";
  });
  reactExports.useEffect(() => {
    try {
      window.localStorage.setItem("qiyasat-multi-mode", mode);
    } catch {
    }
  }, [mode]);
  reactExports.useEffect(() => {
    fetch("/api/datasets").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : d.datasets || [];
      setDatasets(list);
    }).catch(() => {
    });
  }, []);
  const addPanel = () => {
    if (panels.length < 6) setPanels([...panels, null]);
  };
  const removePanel = (idx) => {
    if (panels.length <= 1) {
      setPanels([null]);
    } else {
      setPanels(panels.filter((_, i) => i !== idx));
    }
    if (fullscreenIdx === idx) setFullscreenIdx(null);
  };
  const setPanel = (idx, id) => {
    const next = [...panels];
    next[idx] = id;
    setPanels(next);
  };
  const toggleFullscreen = (idx) => {
    setFullscreenIdx(fullscreenIdx === idx ? null : idx);
  };
  const openAllInNewTabs = () => {
    const ids = panels.filter((id) => !!id);
    if (ids.length === 0) return;
    ids.forEach((id, i) => {
      setTimeout(() => openInNewTab(id), i * 80);
    });
  };
  const selectedCount = panels.filter((p) => !!p).length;
  const visiblePanels = fullscreenIdx !== null && mode === "iframe" ? [{ dsId: panels[fullscreenIdx], originalIdx: fullscreenIdx }] : panels.map((dsId, originalIdx) => ({ dsId, originalIdx }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Ruler, { className: "w-6 h-6 text-primary" }),
          isAr ? "تحليل متعدد الملفات" : "Multi-File Analysis"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm mt-1", children: isAr ? "اختر ملفات وافتحها في تبويبات جديدة بالواجهة الكاملة، أو اعرضها جنبًا إلى جنب داخل الصفحة" : "Select datasets and open each in a new tab with the full UI, or view side-by-side inline" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex rounded-md border bg-background p-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setMode("tabs"),
              className: `px-3 py-1.5 text-xs rounded flex items-center gap-1.5 ${mode === "tabs" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`,
              title: isAr ? "تبويبات جديدة" : "New tabs",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, { className: "w-3.5 h-3.5" }),
                isAr ? "تبويبات" : "Tabs"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setMode("iframe"),
              className: `px-3 py-1.5 text-xs rounded flex items-center gap-1.5 ${mode === "iframe" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`,
              title: isAr ? "عرض داخل الصفحة" : "Inline view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SquareSplitHorizontal, { className: "w-3.5 h-3.5" }),
                isAr ? "داخل الصفحة" : "Inline"
              ]
            }
          )
        ] }),
        mode === "tabs" && selectedCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: openAllInNewTabs, className: "gap-1.5", size: "sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-4 h-4" }),
          isAr ? `فتح الكل (${selectedCount})` : `Open all (${selectedCount})`
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            onClick: addPanel,
            disabled: panels.length >= 6 || mode === "iframe" && fullscreenIdx !== null,
            variant: "outline",
            size: "sm",
            className: "gap-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base leading-none", children: "+" }),
              isAr ? "إضافة" : "Add",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
                "(",
                panels.length,
                "/6)"
              ] })
            ]
          }
        )
      ] })
    ] }),
    mode === "tabs" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: panels.map((dsId, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      DatasetCard,
      {
        dsId,
        onChange: (id) => setPanel(idx, id),
        onRemove: () => removePanel(idx),
        datasets,
        isAr,
        panelNumber: idx + 1
      },
      idx
    )) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `grid gap-3 ${fullscreenIdx !== null ? "grid-cols-1" : panels.length === 1 ? "grid-cols-1" : panels.length === 2 ? "grid-cols-1 lg:grid-cols-2" : panels.length === 3 ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"}`,
        children: visiblePanels.map(({ dsId, originalIdx }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          AnalysisPanelIframe,
          {
            dsId,
            onChange: (id) => setPanel(originalIdx, id),
            onRemove: () => removePanel(originalIdx),
            datasets,
            isAr,
            panelNumber: originalIdx + 1,
            isFullscreen: fullscreenIdx === originalIdx,
            onToggleFullscreen: () => toggleFullscreen(originalIdx)
          },
          originalIdx
        ))
      }
    )
  ] });
}
export {
  MultiAnalysisPage as default
};
//# sourceMappingURL=multi-analysis-DTfV-3jU.js.map
