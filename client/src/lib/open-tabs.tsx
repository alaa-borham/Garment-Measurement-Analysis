import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export interface OpenTab {
  key: string;       // \u0645\u0639\u0631\u0651\u0641 \u0641\u0631\u064a\u062f \u0644\u0644\u062a\u0628\u0648\u064a\u0628 (\u0642\u062f \u062a\u062a\u0643\u0631\u0631 datasetId \u0644\u0643\u0646 key \u0641\u0631\u064a\u062f)
  datasetId: number; // \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u062a\u0628\u0637
  name: string;
}

interface OpenTabsValue {
  tabs: OpenTab[];
  activeKey: string | null;
  /** \u064a\u0641\u062a\u062d \u0627\u0644\u0645\u0644\u0641: \u0625\u0646 \u0643\u0627\u0646 \u0645\u0641\u062a\u0648\u062d\u0627\u064b \u064a\u0641\u0639\u0651\u0644\u0647 \u0648\u064a\u0639\u064a\u062f key \u0627\u0644\u0645\u0648\u062c\u0648\u062f\u060c \u0648\u0625\u0644\u0627 \u064a\u0646\u0634\u0626 \u062a\u0628\u0648\u064a\u0628\u0627\u064b \u062c\u062f\u064a\u062f\u0627\u064b. */
  openOrFocus: (datasetId: number, name: string) => string;
  /** \u064a\u0641\u062a\u062d \u062f\u0627\u0626\u0645\u0627\u064b \u062a\u0628\u0648\u064a\u0628\u0627\u064b \u062c\u062f\u064a\u062f\u0627\u064b \u0644\u0646\u0641\u0633 \u0627\u0644\u0645\u0644\u0641 (\u062d\u062a\u0649 \u0644\u0648 \u0643\u0627\u0646 \u0645\u0641\u062a\u0648\u062d\u0627\u064b). \u064a\u0639\u064a\u062f key \u0627\u0644\u062c\u062f\u064a\u062f. */
  openNew: (datasetId: number, name: string) => string;
  closeTab: (key: string) => void;
  setActive: (key: string) => void;
  renameByDataset: (datasetId: number, name: string) => void;
}

const OpenTabsContext = createContext<OpenTabsValue>({
  tabs: [],
  activeKey: null,
  openOrFocus: () => "",
  openNew: () => "",
  closeTab: () => {},
  setActive: () => {},
  renameByDataset: () => {},
});

export function OpenTabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const counter = useRef(0);

  const genKey = useCallback((datasetId: number) => {
    counter.current += 1;
    return `t${datasetId}-${Date.now()}-${counter.current}`;
  }, []);

  const openOrFocus = useCallback(
    (datasetId: number, name: string) => {
      let existingKey: string | null = null;
      setTabs((prev) => {
        const found = prev.find((x) => x.datasetId === datasetId);
        if (found) {
          existingKey = found.key;
          return prev;
        }
        const key = genKey(datasetId);
        existingKey = key;
        return [...prev, { key, datasetId, name }];
      });
      const k = existingKey!;
      setActiveKey(k);
      return k;
    },
    [genKey]
  );

  const openNew = useCallback(
    (datasetId: number, name: string) => {
      const key = genKey(datasetId);
      setTabs((prev) => [...prev, { key, datasetId, name }]);
      setActiveKey(key);
      return key;
    },
    [genKey]
  );

  const closeTab = useCallback((key: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((x) => x.key === key);
      if (idx === -1) return prev;
      const next = prev.filter((x) => x.key !== key);
      setActiveKey((cur) => {
        if (cur !== key) return cur;
        if (next.length === 0) return null;
        const newIdx = Math.min(idx, next.length - 1);
        return next[newIdx].key;
      });
      return next;
    });
  }, []);

  const setActive = useCallback((key: string) => setActiveKey(key), []);

  const renameByDataset = useCallback((datasetId: number, name: string) => {
    setTabs((prev) =>
      prev.map((x) => (x.datasetId === datasetId && x.name !== name ? { ...x, name } : x))
    );
  }, []);

  return (
    <OpenTabsContext.Provider
      value={{ tabs, activeKey, openOrFocus, openNew, closeTab, setActive, renameByDataset }}
    >
      {children}
    </OpenTabsContext.Provider>
  );
}

export function useOpenTabs() {
  return useContext(OpenTabsContext);
}
