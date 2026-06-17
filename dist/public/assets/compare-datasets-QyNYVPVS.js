import { r as reactExports, L as LangContext, j as jsxRuntimeExports, a7 as GitCompare, B as Button, C as Card, k as CardHeader, m as Badge, X, O as Link, a8 as ExternalLink, a9 as LoaderCircle } from "./index-klzEDF9_.js";
import { M as Minimize2, a as Maximize2 } from "./minimize-2-BaAladWb.js";
function DatasetPanel({
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
    fetch(`/api/datasets/${dsId}`).then((r) => r.ok ? r.json() : null).then((d) => {
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
          Link,
          {
            href: `/datasets/${dataset.id}`,
            className: "text-primary hover:underline flex items-center gap-1 shrink-0 font-medium",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-3 h-3" }),
              isAr ? "فتح كامل" : "Open"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `relative bg-background ${isFullscreen ? "h-[calc(100vh-200px)]" : "h-[700px]"}`, children: [
      !dsId && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(GitCompare, { className: "w-10 h-10 mx-auto mb-2 opacity-30" }),
        isAr ? "اختر ملفاً من القائمة أعلاه" : "Select a dataset"
      ] }),
      loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 animate-spin text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: isAr ? "جارٍ التحميل..." : "Loading..." })
      ] }),
      !loading && dataset && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        iframeLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background z-10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 animate-spin text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: isAr ? "جارٍ تحميل لوحة التحليل..." : "Loading workspace..." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "iframe",
          {
            src: `/#/datasets/${dataset.id}?embed=1`,
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
function CompareDatasetsPage() {
  const { lang } = reactExports.useContext(LangContext);
  const isAr = lang === "ar";
  const [datasets, setDatasets] = reactExports.useState([]);
  const [panels, setPanels] = reactExports.useState([null, null]);
  const [fullscreenIdx, setFullscreenIdx] = reactExports.useState(null);
  reactExports.useEffect(() => {
    fetch("/api/datasets").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : d.datasets || [];
      setDatasets(list);
    }).catch(() => {
    });
  }, []);
  const addPanel = () => {
    if (panels.length < 4) setPanels([...panels, null]);
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
  const visiblePanels = fullscreenIdx !== null ? [{ dsId: panels[fullscreenIdx], originalIdx: fullscreenIdx }] : panels.map((dsId, originalIdx) => ({ dsId, originalIdx }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(GitCompare, { className: "w-6 h-6 text-primary" }),
          isAr ? "مقارنة الملفات" : "Compare Datasets"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm mt-1", children: isAr ? "كل لوحة تعرض الواجهة الكاملة (استعراض، تحليل، Pivot، مخطط، تحليل متقدم) لملف مختار" : "Each panel shows the full workspace (Explore, Analyze, Pivot, Chart, Advanced) for a selected dataset" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          onClick: addPanel,
          disabled: panels.length >= 4 || fullscreenIdx !== null,
          variant: "outline",
          className: "gap-1",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base leading-none", children: "+" }),
            isAr ? "إضافة عمود" : "Add column",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
              "(",
              panels.length,
              "/4)"
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `grid gap-3 ${fullscreenIdx !== null ? "grid-cols-1" : panels.length === 1 ? "grid-cols-1" : panels.length === 2 ? "grid-cols-1 lg:grid-cols-2" : panels.length === 3 ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"}`,
        children: visiblePanels.map(({ dsId, originalIdx }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          DatasetPanel,
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
  CompareDatasetsPage as default
};
//# sourceMappingURL=compare-datasets-QyNYVPVS.js.map
