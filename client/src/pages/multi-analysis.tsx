import { useState, useEffect, useContext } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Ruler,
  X,
  ExternalLink,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { Link } from "wouter";

interface Dataset {
  id: number;
  name: string;
  fileName: string;
  rowsCount?: number;
  columns?: string[];
}

function AnalysisPanel({
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
            <option value="">
              {isAr ? "اختر ملفاً..." : "Select dataset..."}
            </option>
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
              title={
                isFullscreen
                  ? isAr
                    ? "تصغير"
                    : "Minimize"
                  : isAr
                  ? "تكبير"
                  : "Expand"
              }
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
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
            <div
              className="text-muted-foreground truncate flex-1"
              title={dataset.fileName}
            >
              <span className="font-medium">{dataset.fileName}</span>
              <span className="mx-1">·</span>
              <span className="font-mono">
                {(dataset.rowsCount ?? 0).toLocaleString()}{" "}
                {isAr ? "صف" : "rows"} · {dataset.columns?.length || 0}{" "}
                {isAr ? "عمود" : "cols"}
              </span>
            </div>
            <Link
              href={`/datasets/${dataset.id}`}
              onClick={(e) => {
                e.preventDefault();
                window.open(`/#/datasets/${dataset.id}?tab=compare`, "_blank");
              }}
              className="text-primary hover:underline flex items-center gap-1 shrink-0 font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              {isAr ? "فتح كامل" : "Open"}
            </Link>
          </div>
        )}
      </CardHeader>

      <div
        className={`relative bg-background ${
          isFullscreen ? "h-[calc(100vh-200px)]" : "h-[800px]"
        }`}
      >
        {!dsId && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-muted-foreground">
            <Ruler className="w-10 h-10 mx-auto mb-2 opacity-30" />
            {isAr ? "اختر ملفاً من القائمة أعلاه" : "Select a dataset"}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              {isAr ? "جارٍ التحميل..." : "Loading..."}
            </span>
          </div>
        )}

        {!loading && dataset && (
          <>
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  {isAr ? "جارٍ تحميل لوحة التحليل..." : "Loading analysis..."}
                </span>
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

export default function MultiAnalysisPage() {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [panels, setPanels] = useState<(number | null)[]>([null, null]);
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);

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

  const visiblePanels =
    fullscreenIdx !== null
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
              ? "كل لوحة تعرض واجهة التحليل المتقدم (الأعمدة + الألوان + الصفوف) لملف مختار، جنبًا إلى جنب"
              : "Each panel shows the full Advanced Analysis (columns + colors + rows) for a selected dataset, side by side"}
          </p>
        </div>
        <Button
          onClick={addPanel}
          disabled={panels.length >= 4 || fullscreenIdx !== null}
          variant="outline"
          className="gap-1"
        >
          <span className="text-base leading-none">+</span>
          {isAr ? "إضافة لوحة" : "Add panel"}
          <span className="text-xs text-muted-foreground">
            ({panels.length}/4)
          </span>
        </Button>
      </div>

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
          <AnalysisPanel
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
    </div>
  );
}
