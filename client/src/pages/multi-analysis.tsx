import { useState, useEffect, useContext } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Ruler,
  X,
  ExternalLink,
  Maximize2,
  Minimize2,
  LayoutGrid,
  SquareSplitHorizontal,
  FileSpreadsheet,
} from "lucide-react";
import { LangContext } from "@/lib/i18n";

interface Dataset {
  id: number;
  name: string;
  fileName: string;
  rowsCount?: number;
  columns?: string[];
}

// فتح نافذة جديدة مع نفس الثيم/اللغة (يقرأهما script في index.html من localStorage)
function openInNewTab(id: number) {
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
  onToggleFullscreen,
}: {
  dsId: number | null;
  onChange: (id: number) => void;
  onRemove: () => void;
  datasets: Dataset[];
  isAr: boolean;
  panelNumber: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    if (!dsId) {
      setDataset(null);
      return;
    }
    setLoading(true);
    setIframeLoading(true);
    fetch(`/api/datasets/${dsId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setDataset({
            id: d.id,
            name: d.name,
            fileName: d.fileName,
            rowsCount: d.rowsCount,
            columns: d.columns,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dsId]);

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-2 pt-2 space-y-1.5 bg-muted/30 border-b">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="default" className="shrink-0 text-xs">
            #{panelNumber}
          </Badge>
          <select
            value={dsId || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 px-3 py-1.5 text-sm rounded-md border bg-background min-w-0 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="">{isAr ? "اختر ملفاً..." : "Select dataset..."}</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {dsId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              className="h-8 w-8 shrink-0"
              title={isFullscreen ? (isAr ? "تصغير" : "Minimize") : (isAr ? "تكبير" : "Expand")}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          )}
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
                {(dataset.rowsCount ?? 0).toLocaleString()} {isAr ? "صف" : "rows"} · {dataset.columns?.length || 0} {isAr ? "عمود" : "cols"}
              </span>
            </div>
            <button
              onClick={() => openInNewTab(dataset.id)}
              className="text-primary hover:underline flex items-center gap-1 shrink-0 font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              {isAr ? "تبويب جديد" : "New tab"}
            </button>
          </div>
        )}
      </CardHeader>

      <div className={`relative bg-background ${isFullscreen ? "h-[calc(100vh-200px)]" : "h-[800px]"}`}>
        {!dsId && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-muted-foreground">
            <Ruler className="w-10 h-10 mx-auto mb-2 opacity-30" />
            {isAr ? "اختر ملفاً من القائمة أعلاه" : "Select a dataset"}
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {!loading && dataset && (
          <>
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <iframe
              key={dataset.id}
              src={`/#/datasets/${dataset.id}?embed=1&tab=compare`}
              title={dataset.name}
              className="w-full h-full border-0"
              onLoad={() => setIframeLoading(false)}
            />
          </>
        )}
      </div>
    </Card>
  );
}

// نمط البطاقات: قائمة ملفات مختارة + زر فتح في تبويب جديد
function DatasetCard({
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dsId) {
      setDataset(null);
      return;
    }
    setLoading(true);
    fetch(`/api/datasets/${dsId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setDataset({
            id: d.id,
            name: d.name,
            fileName: d.fileName,
            rowsCount: d.rowsCount,
            columns: d.columns,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dsId]);

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-2 pt-2 space-y-1.5 bg-muted/30 border-b">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="default" className="shrink-0 text-xs">
            #{panelNumber}
          </Badge>
          <select
            value={dsId || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 px-3 py-1.5 text-sm rounded-md border bg-background min-w-0 focus:ring-2 focus:ring-primary/30 focus:outline-none"
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
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
        {!dsId && (
          <>
            <Ruler className="w-12 h-12 opacity-20" />
            <p className="text-sm text-muted-foreground">{isAr ? "اختر ملفاً من القائمة أعلاه" : "Select a dataset above"}</p>
          </>
        )}
        {loading && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
        {!loading && dataset && (
          <>
            <FileSpreadsheet className="w-10 h-10 text-primary opacity-80" />
            <div className="space-y-1">
              <div className="font-semibold text-base truncate max-w-[260px]" title={dataset.name}>
                {dataset.name}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[260px]" title={dataset.fileName}>
                {dataset.fileName}
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                {(dataset.rowsCount ?? 0).toLocaleString()} {isAr ? "صف" : "rows"} · {dataset.columns?.length || 0} {isAr ? "عمود" : "cols"}
              </div>
            </div>
            <Button
              onClick={() => openInNewTab(dataset.id)}
              className="gap-2 mt-2"
              size="sm"
            >
              <ExternalLink className="w-4 h-4" />
              {isAr ? "فتح في تبويب جديد" : "Open in new tab"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function MultiAnalysisPage() {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [panels, setPanels] = useState<(number | null)[]>([null, null]);
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<"tabs" | "iframe">(() => {
    if (typeof window === "undefined") return "tabs";
    return (window.localStorage.getItem("qiyasat-multi-mode") as any) || "tabs";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("qiyasat-multi-mode", mode);
    } catch {}
  }, [mode]);

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
    if (panels.length < 6) setPanels([...panels, null]);
  };

  const removePanel = (idx: number) => {
    if (panels.length <= 1) {
      setPanels([null]);
    } else {
      setPanels(panels.filter((_, i) => i !== idx));
    }
    if (fullscreenIdx === idx) setFullscreenIdx(null);
  };

  const setPanel = (idx: number, id: number) => {
    const next = [...panels];
    next[idx] = id;
    setPanels(next);
  };

  const toggleFullscreen = (idx: number) => {
    setFullscreenIdx(fullscreenIdx === idx ? null : idx);
  };

  const openAllInNewTabs = () => {
    const ids = panels.filter((id): id is number => !!id);
    if (ids.length === 0) return;
    ids.forEach((id, i) => {
      // فاصل بسيط بين فتح كل تبويب لتجنب حجب المتصفح
      setTimeout(() => openInNewTab(id), i * 80);
    });
  };

  const selectedCount = panels.filter((p) => !!p).length;

  const visiblePanels =
    fullscreenIdx !== null && mode === "iframe"
      ? [{ dsId: panels[fullscreenIdx], originalIdx: fullscreenIdx }]
      : panels.map((dsId, originalIdx) => ({ dsId, originalIdx }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ruler className="w-6 h-6 text-primary" />
            {isAr ? "تحليل متعدد الملفات" : "Multi-File Analysis"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAr
              ? "اختر ملفات وافتحها في تبويبات جديدة بالواجهة الكاملة، أو اعرضها جنبًا إلى جنب داخل الصفحة"
              : "Select datasets and open each in a new tab with the full UI, or view side-by-side inline"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* مبدّل النمط */}
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <button
              onClick={() => setMode("tabs")}
              className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 ${
                mode === "tabs" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              title={isAr ? "تبويبات جديدة" : "New tabs"}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {isAr ? "تبويبات" : "Tabs"}
            </button>
            <button
              onClick={() => setMode("iframe")}
              className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 ${
                mode === "iframe" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              title={isAr ? "عرض داخل الصفحة" : "Inline view"}
            >
              <SquareSplitHorizontal className="w-3.5 h-3.5" />
              {isAr ? "داخل الصفحة" : "Inline"}
            </button>
          </div>

          {mode === "tabs" && selectedCount > 0 && (
            <Button onClick={openAllInNewTabs} className="gap-1.5" size="sm">
              <ExternalLink className="w-4 h-4" />
              {isAr ? `فتح الكل (${selectedCount})` : `Open all (${selectedCount})`}
            </Button>
          )}

          <Button
            onClick={addPanel}
            disabled={panels.length >= 6 || (mode === "iframe" && fullscreenIdx !== null)}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <span className="text-base leading-none">+</span>
            {isAr ? "إضافة" : "Add"}
            <span className="text-xs text-muted-foreground">({panels.length}/6)</span>
          </Button>
        </div>
      </div>

      {mode === "tabs" ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {panels.map((dsId, idx) => (
            <DatasetCard
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
      ) : (
        <div
          className={`grid gap-3 ${
            fullscreenIdx !== null
              ? "grid-cols-1"
              : panels.length === 1
              ? "grid-cols-1"
              : panels.length === 2
              ? "grid-cols-1 lg:grid-cols-2"
              : panels.length === 3
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
          }`}
        >
          {visiblePanels.map(({ dsId, originalIdx }) => (
            <AnalysisPanelIframe
              key={originalIdx}
              dsId={dsId}
              onChange={(id) => setPanel(originalIdx, id)}
              onRemove={() => removePanel(originalIdx)}
              datasets={datasets}
              isAr={isAr}
              panelNumber={originalIdx + 1}
              isFullscreen={fullscreenIdx === originalIdx}
              onToggleFullscreen={() => toggleFullscreen(originalIdx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
