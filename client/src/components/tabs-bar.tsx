import { useContext } from "react";
import { useLocation } from "wouter";
import { X, FileSpreadsheet, Home, Copy } from "lucide-react";
import { useOpenTabs } from "@/lib/open-tabs";
import { LangContext } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function TabsBar() {
  const { tabs, activeKey, closeTab, setActive, openNew } = useOpenTabs();
  const [location, setLocation] = useLocation();
  const { t, lang } = useContext(LangContext);

  if (tabs.length === 0) return null;

  // \u0641\u064a \u0635\u0641\u062d\u0629 \u063a\u064a\u0631 dataset (\u0645\u062b\u0644 / \u0623\u0648 /upload) \u0644\u0627 \u064a\u0648\u062c\u062f \u062a\u0628\u0648\u064a\u0628 \u0646\u0634\u0637
  const onDatasetRoute = location.startsWith("/datasets/");

  const handleClick = (key: string, datasetId: number) => {
    setActive(key);
    // \u0646\u062d\u0627\u0641\u0638 \u0639\u0644\u0649 \u0631\u0627\u0628\u0637 \u0628\u0633\u064a\u0637\u060c \u0648 workspace \u064a\u062e\u062a\u0627\u0631 \u062d\u0633\u0628 activeKey
    if (!location.startsWith(`/datasets/${datasetId}`)) {
      setLocation(`/datasets/${datasetId}`);
    }
  };

  const handleClose = (e: React.MouseEvent, key: string, datasetId: number) => {
    e.stopPropagation();
    const remaining = tabs.filter((x) => x.key !== key);
    closeTab(key);
    // \u0625\u0630\u0627 \u0623\u063a\u0644\u0642\u0646\u0627 \u0627\u0644\u0646\u0634\u0637 \u0648 location \u0644\u0646\u0641\u0633 \u0627\u0644\u0645\u0644\u0641 \u0648\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0628\u0648\u064a\u0628\u0627\u062a \u0623\u062e\u0631\u0649 \u0644\u0647\u060c \u0627\u0646\u062a\u0642\u0644
    if (location.startsWith(`/datasets/${datasetId}`)) {
      const stillHasSame = remaining.some((x) => x.datasetId === datasetId);
      if (!stillHasSame) {
        if (remaining.length > 0) {
          // \u0627\u0646\u062a\u0642\u0644 \u0644\u062a\u0628\u0648\u064a\u0628 \u0645\u062c\u0627\u0648\u0631
          const idx = tabs.findIndex((x) => x.key === key);
          const next = remaining[Math.min(idx, remaining.length - 1)];
          setLocation(`/datasets/${next.datasetId}`);
        } else {
          setLocation("/");
        }
      }
    }
  };

  const handleDuplicate = (e: React.MouseEvent, datasetId: number, name: string) => {
    e.stopPropagation();
    const newKey = openNew(datasetId, name);
    setActive(newKey);
    if (!location.startsWith(`/datasets/${datasetId}`)) {
      setLocation(`/datasets/${datasetId}`);
    }
  };

  return (
    <div className="border-b border-border bg-muted/30 sticky top-16 z-40">
      <div className="w-full px-3 flex items-stretch gap-0.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setLocation("/")}
          className={cn(
            "flex items-center gap-1.5 px-3 h-10 text-sm border-b-2 shrink-0 hover-elevate",
            !onDatasetRoute
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
          data-testid="tab-home"
          title={t.nav.datasets}
        >
          <Home className="w-3.5 h-3.5" />
        </button>
        {tabs.map((tab) => {
          const isActive = onDatasetRoute && activeKey === tab.key;
          // \u0625\u0630\u0627 \u0643\u0627\u0646 \u0644\u0644\u0645\u0644\u0641 \u0623\u0643\u062b\u0631 \u0645\u0646 \u062a\u0628\u0648\u064a\u0628\u060c \u0623\u0636\u0641 \u0631\u0642\u0645\u0627\u064b
          const sameIdTabs = tabs.filter((x) => x.datasetId === tab.datasetId);
          const showIndex = sameIdTabs.length > 1;
          const indexInGroup = sameIdTabs.findIndex((x) => x.key === tab.key) + 1;
          return (
            <div
              key={tab.key}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(tab.key, tab.datasetId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClick(tab.key, tab.datasetId);
              }}
              className={cn(
                "group flex items-center gap-1.5 ps-3 pe-1 h-10 text-sm border-b-2 shrink-0 max-w-[240px] cursor-pointer hover-elevate",
                isActive
                  ? "border-primary text-foreground bg-background"
                  : "border-transparent text-muted-foreground"
              )}
              data-testid={`tab-${tab.key}`}
              title={tab.name + (showIndex ? ` · #${indexInGroup}` : "")}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {tab.name}
                {showIndex && (
                  <span className="ms-1 text-[10px] text-muted-foreground">
                    #{indexInGroup}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={(e) => handleDuplicate(e, tab.datasetId, tab.name)}
                className="ms-0.5 w-6 h-6 rounded inline-flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-primary/10"
                data-testid={`button-duplicate-tab-${tab.key}`}
                aria-label={lang === "ar" ? "تبويب جديد بنفس الملف" : "Duplicate tab"}
                title={lang === "ar" ? "فتح نفس الملف في تبويب جديد" : "Open same file in a new tab"}
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => handleClose(e, tab.key, tab.datasetId)}
                className="w-6 h-6 rounded inline-flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-destructive/10"
                data-testid={`button-close-tab-${tab.key}`}
                aria-label="close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
