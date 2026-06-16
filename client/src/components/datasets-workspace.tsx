import { useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { useOpenTabs } from "@/lib/open-tabs";
import DatasetPage from "@/pages/dataset";

/**
 * \u064a\u0628\u0642\u064a \u0643\u0644 \u062a\u0628\u0648\u064a\u0628 mounted \u0628\u062d\u0627\u0644\u062a\u0647 \u0627\u0644\u0645\u0633\u062a\u0642\u0644\u0629 (\u0641\u0644\u0627\u062a\u0631\u060c \u0635\u0641\u062d\u0629\u060c \u062a\u0645\u064a\u064a\u0632\u060c \u0627\u0644\u062a\u0628\u0648\u064a\u0628 \u0627\u0644\u062f\u0627\u062e\u0644\u064a)\u060c
 * \u0648\u064a\u0639\u0631\u0636 \u0641\u0642\u0637 \u0627\u0644\u0646\u0634\u0637.
 */
export default function DatasetsWorkspace() {
  const [, params] = useRoute("/datasets/:id");
  const routeId = parseInt(params?.id || "0");
  const { tabs, activeKey, openOrFocus } = useOpenTabs();

  // \u0639\u0646\u062f \u0627\u0644\u062f\u062e\u0648\u0644 \u0639\u0628\u0631 \u0631\u0627\u0628\u0637 \u0645\u0628\u0627\u0634\u0631 \u0644\u0645\u0644\u0641 \u0644\u0627 \u062a\u0648\u062c\u062f \u0644\u0647 \u062a\u0628\u0648\u064a\u0628\u0627\u062a\u060c \u0623\u0646\u0634\u0626 \u062a\u0628\u0648\u064a\u0628\u0627\u064b
  useEffect(() => {
    if (!routeId) return;
    const hasAnyForRoute = tabs.some((t) => t.datasetId === routeId);
    if (!hasAnyForRoute) {
      openOrFocus(routeId, `#${routeId}`);
    }
  }, [routeId, tabs, openOrFocus]);

  // \u0627\u0644\u062a\u0628\u0648\u064a\u0628 \u0627\u0644\u0646\u0634\u0637 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0644\u0645\u0644\u0641 routeId. \u0625\u0646 \u0627\u062e\u062a\u0644\u0641 (\u062a\u063a\u064a\u0651\u0631 \u0627\u0644 URL)\u060c \u062e\u0630 \u0623\u0648\u0644 \u062a\u0628\u0648\u064a\u0628 \u0644\u0640 routeId
  const effectiveKey = useMemo(() => {
    if (!routeId) return activeKey;
    const activeTab = tabs.find((t) => t.key === activeKey);
    if (activeTab && activeTab.datasetId === routeId) return activeKey;
    const first = tabs.find((t) => t.datasetId === routeId);
    return first?.key ?? null;
  }, [routeId, activeKey, tabs]);

  // \u0641\u0631\u0636 \u062a\u0641\u0639\u064a\u0644 \u062a\u0628\u0648\u064a\u0628 \u0635\u062d\u064a\u062d \u0625\u0646 \u0644\u0632\u0645
  const { setActive } = useOpenTabs();
  useEffect(() => {
    if (effectiveKey && effectiveKey !== activeKey) {
      setActive(effectiveKey);
    }
  }, [effectiveKey, activeKey, setActive]);

  return (
    <>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          style={{ display: tab.key === effectiveKey ? undefined : "none" }}
        >
          <DatasetPage idProp={tab.datasetId} />
        </div>
      ))}
    </>
  );
}
