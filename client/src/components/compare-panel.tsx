import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GitCompare,
  Rows3,
  Columns3,
  ArrowDownUp, ArrowUp, ArrowDown,
  Grid3x3,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  Save,
  FolderOpen,
  X,
} from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { exportCompareToExcel } from "@/lib/compare-export";
import { exportCompareToPDF } from "@/lib/compare-pdf-export";
import { exportCompareToCSV } from "@/lib/compare-csv-export";
import { useToast } from "@/hooks/use-toast";
import { useTransferPermissions } from "@/hooks/use-transfer-permissions";
import { detectOutliers, type OutlierMethod } from "@/lib/outliers";
import { FileText, Upload as UploadIcon, AlertTriangle } from "lucide-react";

interface AdvancedAnalysisProps {
  datasetId: number;
  columns: string[];
}

// استيراد من الملف المشترك (لتفادي circular imports مع ملفات التصدير)
import {
  extractNumber,
  colorForDiff,
  fmt,
  DEFAULT_BANDS,
  type Row,
  type ColorBand,
} from "@/lib/compare-shared";
// إعادة تصدير لمن يستورد من compare-panel
export { extractNumber, colorForDiff, fmt, DEFAULT_BANDS };
export type { Row, ColorBand };

export default function AdvancedAnalysisPanel({ datasetId, columns }: AdvancedAnalysisProps) {
  const { canExport, canImportTemplates } = useTransferPermissions();
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const { toast } = useToast();

  // إبراز القيم الشاذة في النتائج
  const [outliersEnabled, setOutliersEnabled] = useState<boolean>(false);
  const [outlierMethod] = useState<OutlierMethod>("iqr");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // مرجع لبوكس اختيار الأعمدة (لـ click-outside auto-collapse)
  const colsContainerRef = useRef<HTMLDivElement | null>(null);

  const L = {
    modeTwoRows: isAr ? "فروق بين صفين" : "Two-row diff",
    modeMatrix: isAr ? "مصفوفة صفوف × أعمدة" : "Rows × Columns matrix",
    modeSequential: isAr ? "فروق متتالية" : "Sequential diff",
    selectRows: isAr ? "اختر الصفوف" : "Select rows",
    selectColumns: isAr ? "اختر الأعمدة" : "Select columns",
    rowA: isAr ? "الصف المرجع" : "Reference row",
    rowB: isAr ? "الصف للمقارنة" : "Compare row",
    selectAll: isAr ? "تحديد الكل" : "Select all",
    clear: isAr ? "مسح التحديد" : "Clear",
    thresholds: isAr ? "ألوان التحليل" : "Analysis colors",
    addColor: isAr ? "إضافة لون" : "Add color",
    removeColor: isAr ? "حذف" : "Remove",
    resetColors: isAr ? "إعادة للافتراضي" : "Reset to default",
    bandLabel: isAr ? "الاسم" : "Label",
    bandMin: isAr ? "الفرق ≥" : "Diff ≥",
    bandBg: isAr ? "خلفية" : "Background",
    bandFg: isAr ? "نص" : "Text",
    fallbackColor: isAr ? "لون أقل قيمة (احتياطي)" : "Fallback (lowest)",
    redHint: isAr ? "الألوان تطبّق بترتيب تنازلي حسب العتبة" : "Colors applied in descending threshold order",
    matrixRefLabel: isAr ? "مقارنة بـ" : "Compare against",
    refFirst: isAr ? "الصف الأول من المختار" : "First selected row",
    refPrevious: isAr ? "الصف السابق" : "Previous row",
    refRaw: isAr ? "القيم الأصلية (بدون فروق)" : "Raw values (no diff)",
    compute: isAr ? "احسب" : "Compute",
    emptyRows: isAr ? "لا توجد صفوف. ارفع ملفاً أولاً." : "No rows yet.",
    needPicks: isAr ? "اختر الصفوف والأعمدة ثم اضغط احسب" : "Pick rows/columns then press Compute",
    column: isAr ? "العمود" : "Column",
    row: isAr ? "الصف" : "Row",
    diff: isAr ? "الفرق" : "Diff",
    diffFormula: isAr ? "الفرق = (الثاني − الأول)" : "Diff = (Second − First)",
    sequentialFormula: isAr
      ? "كل خلية = (قيمة هذا الصف − قيمة الصف السابق)"
      : "Each cell = (this row value − previous row value)",
    rawValues: isAr ? "القيم الأصلية" : "Raw values",
    rowLabel: isAr ? "اسم الصف" : "Row label",
    rowLabelCol: isAr ? "عمود اسم الصف (اختياري)" : "Row label column (optional)",
    none: isAr ? "بدون" : "None",
    searchRows: isAr ? "ابحث عن صف..." : "Search rows...",
    selectAllFiltered: isAr ? "تحديد المفلتر" : "Select filtered",
    showing: isAr ? "يعرض" : "Showing",
    showMore: isAr ? "عرض 500 إضافي" : "Show 500 more",
    useSearch: isAr ? "استخدم البحث لإيجاد صف آخر" : "Use search to find more",
    openInNewTab: isAr ? "فتح في نافذة جديدة" : "Open in new window",
    exportExcel: isAr ? "تصدير Excel" : "Export Excel",
    exportPDF: isAr ? "تصدير PDF" : "Export PDF",
    exportTplJson: isAr ? "تصدير قوالب JSON" : "Export templates JSON",
    importTplJson: isAr ? "استيراد قوالب JSON" : "Import templates JSON",
    outliersOn: isAr ? "إبراز الشاذة" : "Highlight outliers",
    outliersOff: isAr ? "إخفاء الشاذة" : "Hide outliers",
    outliersFound: isAr ? "قيمة شاذة" : "outliers",
    templatesImported: isAr ? "تم استيراد القوالب" : "Templates imported",
    templatesExported: isAr ? "تم تصدير القوالب" : "Templates exported",
    importFailed: isAr ? "فشل الاستيراد" : "Import failed",
    pdfFailed: isAr ? "فشل تصدير PDF" : "PDF export failed",
    templates: isAr ? "القوالب" : "Templates",
    saveTemplate: isAr ? "حفظ كقالب" : "Save as template",
    loadTemplate: isAr ? "تحميل قالب" : "Load template",
    templateName: isAr ? "اسم القالب" : "Template name",
    save: isAr ? "حفظ" : "Save",
    cancel: isAr ? "إلغاء" : "Cancel",
    noTemplates: isAr ? "لا توجد قوالب محفوظة" : "No saved templates",
    deleteTpl: isAr ? "حذف" : "Delete",
    templateSaved: isAr ? "تم حفظ القالب" : "Template saved",
    templateLoaded: isAr ? "تم تحميل القالب" : "Template loaded",
    waitingForData: isAr ? "بانتظار البيانات من النافذة الأصلية..." : "Waiting for data from main window...",
    liveSync: isAr ? "مزامنة مباشرة" : "Live sync",
    closed: isAr ? "تم إغلاق النافذة الأصلية" : "Main window closed",
  };

  // معرّف فريد للجلسة لقناة البث (يثبت طالما المكوّن حي)
  const channelIdRef = useRef<string>(`qiyasat-analysis-${datasetId}-${Math.random().toString(36).slice(2, 9)}`);

  // ألوان التحليل — ديناميكية (يمكن إضافة/حذف/تعديل)
  const [bands, setBands] = useState<ColorBand[]>(DEFAULT_BANDS);

  // وضع مرجع لوضع المصفوفة: فروق عن الصف الأول أو السابق أو بدون (قيم خام)
  const [matrixRef, setMatrixRef] = useState<"first" | "previous" | "raw">("previous");

  // الصفوف المختارة (بالـ id)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  // ترتيب الصفوف حسب عمود التسمية (XS → S → M → L...)
  const [sortByLabel, setSortByLabel] = useState<boolean>(false);
  // اتجاه الترتيب: تصاعدي 'asc' (XS→XL، 1→100) أو تنازلي 'desc' (XL→XS، 100→1)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  // C: ترتيب مخصص للأعمدة المختارة (drag&drop)
  const [colsOrder, setColsOrder] = useState<string[]>([]);
  const [dragCol, setDragCol] = useState<string | null>(null);

  // دالة مساعدة: تعيد الأعمدة المختارة بترتيب مخصص (إن وجد) أو بترتيب dataset
  const orderedSelectedCols = useMemo(() => {
    const sel = columns.filter((c) => selectedCols.has(c));
    if (colsOrder.length === 0) return sel;
    const orderMap = new Map(colsOrder.map((c, i) => [c, i]));
    return sel.sort((a, b) => {
      const ai = orderMap.has(a) ? orderMap.get(a)! : 1e9;
      const bi = orderMap.has(b) ? orderMap.get(b)! : 1e9;
      return ai - bi;
    });
  }, [columns, selectedCols, colsOrder]);

  const handleDragStart = (col: string) => setDragCol(col);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (target: string) => {
    if (!dragCol || dragCol === target) {
      setDragCol(null);
      return;
    }
    const current = orderedSelectedCols.slice();
    const from = current.indexOf(dragCol);
    const to = current.indexOf(target);
    if (from < 0 || to < 0) {
      setDragCol(null);
      return;
    }
    current.splice(from, 1);
    current.splice(to, 0, dragCol);
    setColsOrder(current);
    setDragCol(null);
  };
  // طي/توسيع قسم اختيار الأعمدة (تلقائي عند بدء تحديد الصفوف)
  const [colsCollapsed, setColsCollapsed] = useState<boolean>(false);
  const [colsCollapsedManual, setColsCollapsedManual] = useState<boolean>(false);
  // طي/توسيع قسم اختيار الصفوف (تلقائي عند الضغط على احسب)
  const [rowsCollapsed, setRowsCollapsed] = useState<boolean>(false);
  // طي بوكس عمود اسم الصف (مصفوفة الصفوف) — useEffect يعتمد على labelCol منقول للأسفل بعد تعريف labelCol
  const [labelColCollapsed, setLabelColCollapsed] = useState<boolean>(false);

  // طي تلقائي عند تحديد ≥1 من الأعمدة وبدء التركيز على الصفوف
  // يطوي عند وجود أعمدة مختارة + بدء تحديد الصفوف، ويفتح إذا لم تبقَ أعمدة مختارة
  useEffect(() => {
    if (colsCollapsedManual) return;
    if (selectedRowIds.size > 0 && selectedCols.size > 0) {
      setColsCollapsed(true);
    } else if (selectedRowIds.size === 0) {
      setColsCollapsed(false);
    }
  }, [selectedRowIds.size, selectedCols.size, colsCollapsedManual]);

  // طي تلقائي لبوكس الأعمدة عند الضغط خارجه
  // (مثل سلوك بوكس الصفوف تمامًا)
  useEffect(() => {
    if (colsCollapsed) return; // مطوي بالفعل
    if (selectedCols.size === 0) return; // لا تجعل الطي تلقائيًا إلا بعد اختيار أعمدة
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // تجاهل الضغط داخل dialog/menu/popover
      if (
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]') ||
        target.closest('[role="listbox"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }
      if (colsContainerRef.current && !colsContainerRef.current.contains(target)) {
        setColsCollapsed(true);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colsCollapsed, selectedCols.size]);

  // وضع الصفين
  const [rowAId, setRowAId] = useState<number | null>(null);
  const [rowBId, setRowBId] = useState<number | null>(null);

  // عمود اسم الصف (اختياري)
  const [labelCol, setLabelCol] = useState<string>("");

  // طيّ تلقائي عند اختيار عمود التسمية
  useEffect(() => {
    if (labelCol) setLabelColCollapsed(true);
  }, [labelCol]);

  // التبويب الحالي (للقوالب)
  const [activeTab, setActiveTab] = useState<"matrix" | "two-rows" | "sequential">("matrix");

  // قوالب المقارنة المحفوظة (localStorage)
  interface CompareTemplate {
    id: string;
    name: string;
    mode: "matrix" | "two-rows" | "sequential";
    selectedCols: string[];
    selectedRowIds: number[];
    bands: ColorBand[];
    matrixRef: "first" | "previous" | "raw";
    labelCol: string;
    createdAt: number;
  }
  const TPL_KEY = `qiyasat-compare-templates-${datasetId}`;
  const [templates, setTemplates] = useState<CompareTemplate[]>(() => {
    try {
      const raw = localStorage.getItem(TPL_KEY);
      return raw ? (JSON.parse(raw) as CompareTemplate[]) : [];
    } catch {
      return [];
    }
  });
  const [showSaveTplDialog, setShowSaveTplDialog] = useState(false);
  const [showLoadTplDialog, setShowLoadTplDialog] = useState(false);
  const [newTplName, setNewTplName] = useState("");

  const persistTemplates = (next: CompareTemplate[]) => {
    setTemplates(next);
    try {
      localStorage.setItem(TPL_KEY, JSON.stringify(next));
      // إشعار حفظ تلقائي سياقي (تحسين #12)
      toast({
        description: isAr ? "تم الحفظ ✓" : "Saved ✓",
        duration: 1500,
      });
    } catch {}
  };

  // تصدير القوالب كملف JSON (تحسين #15)
  const exportTemplatesJson = () => {
    if (!canExport) return;
    try {
      const data = JSON.stringify(
        { version: 1, datasetId, exportedAt: new Date().toISOString(), templates },
        null,
        2
      );
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qiyasat-compare-templates-${datasetId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ description: L.templatesExported, duration: 2000 });
    } catch (err) {
      console.error("export templates failed", err);
    }
  };

  // استيراد القوالب من ملف JSON (تحسين #15)
  const importTemplatesJson = (file: File) => {
    if (!canImportTemplates) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsed = JSON.parse(text);
        const arr: CompareTemplate[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.templates)
            ? parsed.templates
            : [];
        if (!arr.length) throw new Error("empty");
        // دمج بدون تكرار (حسب id)
        const existing = new Map(templates.map((t) => [t.id, t] as const));
        for (const t of arr) {
          if (t && t.id && t.name) {
            // توليد id جديد عند التكرار
            const newId = existing.has(t.id)
              ? `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
              : t.id;
            existing.set(newId, { ...t, id: newId });
          }
        }
        const merged = Array.from(existing.values()).sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        );
        setTemplates(merged);
        localStorage.setItem(TPL_KEY, JSON.stringify(merged));
        toast({ description: L.templatesImported, duration: 2000 });
      } catch (err) {
        console.error("import templates failed", err);
        toast({ description: L.importFailed, variant: "destructive", duration: 2500 });
      }
    };
    reader.readAsText(file);
  };

  const saveCurrentAsTemplate = () => {
    const name = newTplName.trim();
    if (!name) return;
    const tpl: CompareTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      mode: activeTab,
      selectedCols: Array.from(selectedCols),
      selectedRowIds: Array.from(selectedRowIds),
      bands,
      matrixRef,
      labelCol,
      createdAt: Date.now(),
    };
    persistTemplates([tpl, ...templates]);
    setNewTplName("");
    setShowSaveTplDialog(false);
  };

  const loadTemplate = (tpl: CompareTemplate) => {
    setActiveTab(tpl.mode);
    setSelectedCols(new Set(tpl.selectedCols));
    setSelectedRowIds(new Set(tpl.selectedRowIds));
    setBands(tpl.bands && tpl.bands.length ? tpl.bands : DEFAULT_BANDS);
    setMatrixRef(tpl.matrixRef || "previous");
    setLabelCol(tpl.labelCol || "");
    setShowLoadTplDialog(false);
  };

  const deleteTemplate = (id: string) => {
    persistTemplates(templates.filter((t) => t.id !== id));
  };

  // التحديد الفعال للحساب
  const [computed, setComputed] = useState<null | {
    mode: "two-rows" | "matrix" | "sequential";
    rows: Row[];
    cols: string[];
    rowA?: Row;
    rowB?: Row;
    matrixRef?: "first" | "previous" | "raw";
  }>(null);

  // جلب جميع الصفوف (على دفعات حتى 500 لكل طلب)
  const rowsQuery = useQuery<{ rows: Row[]; total: number }>({
    queryKey: ["advanced-rows", datasetId],
    enabled: !!datasetId,
    queryFn: async () => {
      const pageSize = 5000;
      let page = 1;
      let all: Row[] = [];
      let total = 0;
      // حد أقصى أمان: 60 صفحة = 300,000 صف
      for (let i = 0; i < 60; i++) {
        const res = await apiRequest("POST", `/api/datasets/${datasetId}/query`, {
          page,
          pageSize,
          conditions: [],
          logic: "AND",
        });
        const data = await res.json();
        all = all.concat(data.rows || []);
        total = data.total || 0;
        if (all.length >= total || !data.rows?.length) break;
        page++;
      }
      return { rows: all, total };
    },
  });

  const allRows = rowsQuery.data?.rows || [];

  // خريطة: id داخلي -> رقم تسلسلي 1..N
  const rowIndexById = useMemo(() => {
    const m = new Map<number, number>();
    allRows.forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [allRows]);

  // تسمية صف: إذا اختير labelCol استخدمه، وإلا جرّب أول عمود غير فارغ، وإلا رقم تسلسلي
  const rowLabel = (r: Row): string => {
    if (labelCol && r.data[labelCol] !== undefined && r.data[labelCol] !== "") {
      return String(r.data[labelCol]);
    }
    // جرّب أول عمود فيه قيمة غير فارغة ليكون تسمية تلقائية
    for (const c of columns) {
      const v = r.data[c];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        const idx = rowIndexById.get(r.id) ?? r.id;
        return `${idx} · ${String(v)}`;
      }
    }
    return `صف ${rowIndexById.get(r.id) ?? r.id}`;
  };

  // عند تغير الأعمدة المختارة، اختر الكل افتراضياً مرة واحدة
  useEffect(() => {
    if (selectedCols.size === 0 && columns.length > 0) {
      // لا نلمس إذا المستخدم بدأ الاختيار
    }
  }, [columns]);

  // بناء snapshot — رف ثابت لتجنّب مشاكل closure القديم
  const computedRef = useRef(computed);
  const bandsRef = useRef(bands);
  const langRef = useRef(lang);
  const LRef = useRef(L);
  const rowLabelRef = useRef(rowLabel);
  useEffect(() => { computedRef.current = computed; }, [computed]);
  useEffect(() => { bandsRef.current = bands; }, [bands]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { LRef.current = L; });
  useEffect(() => { rowLabelRef.current = rowLabel; });

  const buildSnapshot = () => {
    const c = computedRef.current;
    const b = bandsRef.current;
    let labels: Record<number, string> = {};
    if (c) {
      const list: Row[] = [];
      if (c.rowA) list.push(c.rowA);
      if (c.rowB) list.push(c.rowB);
      list.push(...c.rows);
      list.forEach((r) => { labels[r.id] = rowLabelRef.current(r); });
    }
    return {
      type: "snapshot" as const,
      computed: c,
      bands: b.map((band) => ({ ...band, minDiff: isFinite(band.minDiff) ? band.minDiff : -1e308 })),
      rowLabels: labels,
      lang: langRef.current,
      L: LRef.current,
    };
  };

  // مرجع للنوافذ المفتوحة للإرسال المباشر عبر postMessage
  const openedWindowsRef = useRef<Window[]>([]);

  const broadcastSnapshot = () => {
    const snap = buildSnapshot();
    // 1) postMessage لكل النوافذ المفتوحة مباشرةً
    openedWindowsRef.current = openedWindowsRef.current.filter((w) => !w.closed);
    openedWindowsRef.current.forEach((w) => {
      try { w.postMessage(snap, "*"); } catch {}
    });
    // 2) BroadcastChannel كاحتياطي (إذا same-origin)
    if (channelRef.current) {
      try { channelRef.current.postMessage(snap); } catch {}
    }
  };

  // استقبال رسائل من النوافذ المفتوحة (ready/ping)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "ready" && d?.channel === channelIdRef.current) {
        // تأكد أن المرسل في قائمة النوافذ
        if (e.source && e.source !== window) {
          const src = e.source as Window;
          if (!openedWindowsRef.current.includes(src)) {
            openedWindowsRef.current.push(src);
          }
          try { src.postMessage(buildSnapshot(), "*"); } catch {}
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BroadcastChannel كاحتياطي same-origin
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    try {
      const ch = new BroadcastChannel(channelIdRef.current);
      channelRef.current = ch;
      ch.onmessage = (e) => {
        if (e.data?.type === "ready" || e.data?.type === "ping") {
          try { ch.postMessage(buildSnapshot()); } catch {}
        }
      };
      return () => {
        try { ch.postMessage({ type: "main-closed" }); } catch {}
        ch.close();
        channelRef.current = null;
      };
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // بث عند أي تغيير
  useEffect(() => {
    broadcastSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed, bands, labelCol, lang]);

  const openInNewWindow = () => {
    const url = `${window.location.origin}${window.location.pathname}#/analysis-view?ch=${encodeURIComponent(channelIdRef.current)}`;
    // لا نستخدم noopener حتى نحصل على مرجع النافذة
    const w = window.open(url, "_blank");
    if (w) {
      openedWindowsRef.current.push(w);
      // أرسل snapshot بعد ثوان لتحميل الصفحة (في حال تأخّر إرسال ready)
      const trySend = (delay: number) => setTimeout(() => {
        if (w.closed) return;
        try { w.postMessage(buildSnapshot(), "*"); } catch {}
      }, delay);
      trySend(500);
      trySend(1500);
      trySend(3000);
    }
  };

  const toggleRow = (id: number) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const toggleCol = (c: string) => {
    const next = new Set(selectedCols);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setSelectedCols(next);
  };

  const selectAllRows = () => setSelectedRowIds(new Set(allRows.map((r) => r.id)));
  const clearRows = () => setSelectedRowIds(new Set());
  const selectAllCols = () => setSelectedCols(new Set(columns));
  const clearCols = () => setSelectedCols(new Set());

  // G: كشف تلقائي لأعمدة القياس الرقمية (تتجاهل أعمدة النص فقط)
  const selectNumericCols = () => {
    const numeric = new Set<string>();
    for (const c of columns) {
      let total = 0;
      let nums = 0;
      for (const r of allRows.slice(0, 50)) {
        const v = r.data[c];
        if (v === null || v === undefined || v === "") continue;
        total++;
        if (typeof v === "number" || (typeof v === "string" && !isNaN(parseFloat(v)) && /^[-+]?[\d.,\s]+/.test(v.trim()))) {
          nums++;
        }
      }
      // 70%+ من القيم رقمية
      if (total > 0 && nums / total >= 0.7) {
        numeric.add(c);
      }
    }
    setSelectedCols(numeric);
  };

  const runTwoRows = () => {
    if (rowAId === null || rowBId === null || selectedCols.size === 0) return;
    const a = allRows.find((r) => r.id === rowAId);
    const b = allRows.find((r) => r.id === rowBId);
    if (!a || !b) return;
    setComputed({
      mode: "two-rows",
      rows: [],
      cols: orderedSelectedCols,
      rowA: a,
      rowB: b,
    });
    setRowsCollapsed(true);
  };

  // خريطة ترتيب المقاسات
  const SIZE_ORDER: Record<string, number> = {
    "XXS": 1, "XS": 2, "S": 3, "SM": 3.5, "M": 4, "MD": 4.5,
    "L": 5, "LG": 5.5, "XL": 6, "XXL": 7, "2XL": 7,
    "XXXL": 8, "3XL": 8, "4XL": 9, "5XL": 10, "6XL": 11, "7XL": 12,
  };

  // اكتشاف نوع البيانات السائد: 'size' | 'number' | 'text'
  const detectLabelType = (labels: string[]): "size" | "number" | "text" => {
    if (labels.length === 0) return "text";
    let sizeCount = 0;
    let numberCount = 0;
    for (const lab of labels) {
      const t = (lab ?? "").toString().trim().toUpperCase();
      if (!t) continue;
      if (SIZE_ORDER[t] !== undefined) {
        sizeCount++;
      } else if (!isNaN(parseFloat(t)) && /^-?\d+(\.\d+)?$/.test(t)) {
        numberCount++;
      }
    }
    // إذا أكثر من نصف القيم مقاسات → ترتيب مقاسات
    if (sizeCount >= Math.ceil(labels.length / 2)) return "size";
    // إذا أكثر من نصف القيم أرقام → ترتيب رقمي
    if (numberCount >= Math.ceil(labels.length / 2)) return "number";
    return "text";
  };

  // مقارنة حسب نوع البيانات
  const compareByType = (a: string, b: string, type: "size" | "number" | "text"): number => {
    const sa = (a ?? "").toString().trim();
    const sb = (b ?? "").toString().trim();
    if (type === "size") {
      const oa = SIZE_ORDER[sa.toUpperCase()];
      const ob = SIZE_ORDER[sb.toUpperCase()];
      if (oa !== undefined && ob !== undefined) return oa - ob;
      if (oa !== undefined) return -1;
      if (ob !== undefined) return 1;
      return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
    }
    if (type === "number") {
      const na = parseFloat(sa);
      const nb = parseFloat(sb);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      if (!isNaN(na)) return -1;
      if (!isNaN(nb)) return 1;
      return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
    }
    return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
  };

  // ترتيب الصفوف — أربعة أوضاع:
  //  - sortByLabel=true  + asc  → ترتيب بحسب القياس: XS → S → M → L → XL (كل الصفوف)
  //  - sortByLabel=true  + desc → ترتيب بحسب القياس عكسي: XL → L → M → S → XS (كل الصفوف)
  //  - sortByLabel=false + asc  → ترتيب حسب id الأصلي تصاعدي (بدون فرز بالقياس)
  //  - sortByLabel=false + desc → ترتيب حسب id الأصلي تنازلي
  const maybeSortRows = (rows: Row[]): Row[] => {
    const labels = rows.map((r) => rowLabel(r));
    const type = detectLabelType(labels);
    const dirMul = sortDir === "desc" ? -1 : 1;

    if (sortByLabel) {
      // ✅ ترتيب بحسب القياس (كل الصفوف تظهر، والمتشابه يتجاور)
      return [...rows].sort((ra, rb) => {
        const cmp = compareByType(rowLabel(ra), rowLabel(rb), type);
        if (cmp === 0) return ra.id - rb.id;
        return dirMul * cmp;
      });
    }

    // ❌ ترتيب حسب الترتيب الأصلي (id) تصاعدي/تنازلي فقط — بدون أي فرز بالقياس
    return [...rows].sort((ra, rb) => dirMul * (ra.id - rb.id));
  };

  // تحديث الجدول مباشرة عند تفعيل/إلغاء الترتيب أو تغيير عمود التسمية
  useEffect(() => {
    setComputed((prev) => {
      if (!prev) return prev;
      if (prev.mode === "matrix" || prev.mode === "sequential") {
        const freshRows = allRows.filter((r) => selectedRowIds.has(r.id));
        return { ...prev, rows: maybeSortRows(freshRows) };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortByLabel, sortDir, labelCol]);

  const runMatrix = () => {
    if (selectedRowIds.size === 0 || selectedCols.size === 0) return;
    const rows = maybeSortRows(allRows.filter((r) => selectedRowIds.has(r.id)));
    setComputed({
      mode: "matrix",
      rows,
      cols: orderedSelectedCols,
      matrixRef,
    });
    setRowsCollapsed(true);
  };

  const runSequential = () => {
    if (selectedRowIds.size < 2 || selectedCols.size === 0) return;
    const rows = maybeSortRows(allRows.filter((r) => selectedRowIds.has(r.id)));
    setComputed({
      mode: "sequential",
      rows,
      cols: orderedSelectedCols,
    });
    setRowsCollapsed(true);
  };

  if (rowsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {isAr ? "جارٍ تحميل الصفوف..." : "Loading rows..."}
        </CardContent>
      </Card>
    );
  }

  if (rowsQuery.isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          {isAr ? "تعذّر تحميل الصفوف: " : "Failed to load rows: "}
          {String((rowsQuery.error as any)?.message || rowsQuery.error)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* شريط القوالب */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
          <span className="text-xs font-semibold text-muted-foreground">{L.templates}:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveTplDialog(true)}
            disabled={!selectedCols.size && !selectedRowIds.size}
            className="h-7 text-xs gap-1"
            data-testid="button-save-template"
          >
            <Save className="w-3.5 h-3.5" />
            {L.saveTemplate}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLoadTplDialog(true)}
            className="h-7 text-xs gap-1"
            data-testid="button-load-template"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {L.loadTemplate}
            {templates.length > 0 && (
              <span className="ms-1 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold">
                {templates.length}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportTemplatesJson}
            disabled={!canExport || !templates.length}
            className="h-7 text-xs gap-1"
            title={L.exportTplJson}
            data-testid="button-export-templates-json"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 text-xs gap-1"
            title={L.importTplJson}
            disabled={!canImportTemplates}
            data-testid="button-import-templates-json"
          >
            <UploadIcon className="w-3.5 h-3.5" />
            JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            disabled={!canImportTemplates}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importTemplatesJson(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* حوار حفظ قالب */}
        {showSaveTplDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowSaveTplDialog(false)}
          >
            <div
              className="bg-background border rounded-lg shadow-lg p-4 w-full max-w-md space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{L.saveTemplate}</h3>
                <button
                  type="button"
                  onClick={() => setShowSaveTplDialog(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{L.templateName}</Label>
                <Input
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTplName.trim()) saveCurrentAsTemplate();
                  }}
                  autoFocus
                  data-testid="input-template-name"
                />
                <p className="text-[11px] text-muted-foreground">
                  {isAr
                    ? `سيتم حفظ: ${selectedCols.size} عمود، ${selectedRowIds.size} صف، ${bands.length} لون`
                    : `Will save: ${selectedCols.size} cols, ${selectedRowIds.size} rows, ${bands.length} colors`}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSaveTplDialog(false)}>
                  {L.cancel}
                </Button>
                <Button size="sm" onClick={saveCurrentAsTemplate} disabled={!newTplName.trim()}>
                  {L.save}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* حوار تحميل قالب */}
        {showLoadTplDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowLoadTplDialog(false)}
          >
            <div
              className="bg-background border rounded-lg shadow-lg p-4 w-full max-w-lg space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{L.loadTemplate}</h3>
                <button
                  type="button"
                  onClick={() => setShowLoadTplDialog(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{L.noTemplates}</p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-1.5">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="flex items-center justify-between gap-2 p-2 rounded border hover:bg-muted/50"
                    >
                      <button
                        type="button"
                        onClick={() => loadTemplate(tpl)}
                        className="flex-1 text-start min-w-0"
                        data-testid={`load-template-${tpl.id}`}
                      >
                        <div className="font-medium text-sm truncate">{tpl.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {tpl.mode === "matrix"
                            ? L.modeMatrix
                            : tpl.mode === "two-rows"
                            ? L.modeTwoRows
                            : L.modeSequential}
                          {" • "}
                          {tpl.selectedCols.length} {isAr ? "عمود" : "cols"}
                          {" • "}
                          {tpl.selectedRowIds.length} {isAr ? "صف" : "rows"}
                          {" • "}
                          {tpl.bands.length} {isAr ? "لون" : "colors"}
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplate(tpl.id)}
                        className="h-7 w-7 p-0 text-destructive"
                        data-testid={`delete-template-${tpl.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="h-auto">
            <TabsTrigger value="matrix" data-testid="adv-mode-matrix" className="text-sm font-bold px-4 py-2">
              <Grid3x3 className="w-4 h-4 me-2" />
              {L.modeMatrix}
            </TabsTrigger>
            <TabsTrigger value="two-rows" data-testid="adv-mode-two-rows" className="text-sm font-bold px-4 py-2">
              <Rows3 className="w-4 h-4 me-2" />
              {L.modeTwoRows}
            </TabsTrigger>
            <TabsTrigger value="sequential" data-testid="adv-mode-sequential" className="text-sm font-bold px-4 py-2">
              <ArrowDownUp className="w-4 h-4 me-2" />
              {L.modeSequential}
            </TabsTrigger>
          </TabsList>


          {/* اختيار الأعمدة (مشترك بين كل الأوضاع) — قابل للطي */}
          <div ref={colsContainerRef} className="mt-3 rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setColsCollapsed((v) => !v);
                  setColsCollapsedManual(true);
                }}
                className="flex items-center gap-1.5 text-sm font-bold hover:opacity-80"
                data-testid="toggle-cols-collapse"
              >
                {colsCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
                <Columns3 className="w-3.5 h-3.5" />
                {L.selectColumns} ({selectedCols.size}/{columns.length})
              </button>
              {!colsCollapsed && (
                <div className="flex gap-1 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={selectNumericCols} className="h-7 text-xs" title={isAr ? "اختر أعمدة القياس الرقمية تلقائياً" : "Auto-detect numeric measurement columns"} data-testid="button-auto-numeric">
                    <AlertTriangle className="w-3.5 h-3.5 me-1" />
                    {isAr ? "رقمية" : "Numeric"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectAllCols} className="h-7 text-xs">
                    <CheckSquare className="w-3.5 h-3.5 me-1" />
                    {L.selectAll}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearCols} className="h-7 text-xs">
                    <Square className="w-3.5 h-3.5 me-1" />
                    {L.clear}
                  </Button>
                </div>
              )}
            </div>
            {colsCollapsed ? (
              <div className="flex flex-wrap gap-1 items-center">
                {Array.from(selectedCols).slice(0, 12).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCol(c)}
                    className="group flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 truncate max-w-[160px] hover:bg-red-500/15 hover:border-red-500/40 hover:text-red-600 transition-colors cursor-pointer"
                    title={isAr ? `اضغط لإزالة: ${c}` : `Click to remove: ${c}`}
                  >
                    <span className="truncate">{c}</span>
                    <X className="w-3 h-3 opacity-50 group-hover:opacity-100 flex-shrink-0" />
                  </button>
                ))}
                {selectedCols.size > 12 && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    +{selectedCols.size - 12}
                  </span>
                )}
                {selectedCols.size === 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {isAr ? "لم يتم اختيار أعمدة" : "No columns selected"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setColsCollapsed(false); setColsCollapsedManual(true); }}
                  className="text-[11px] px-2 py-0.5 rounded border border-dashed border-primary/40 text-primary hover:bg-primary/10 ms-1"
                  title={isAr ? "فتح لإضافة/تعديل الأعمدة" : "Open to edit columns"}
                >
                  {isAr ? "+ تعديل" : "+ Edit"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-40 overflow-auto thin-scrollbar">
                {columns.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 text-sm font-semibold cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
                  >
                    <Checkbox checked={selectedCols.has(c)} onCheckedChange={() => toggleCol(c)} />
                    <span className="truncate" title={c}>{c}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* C: ترتيب الأعمدة بالسحب (Drag & Drop) */}
          {selectedCols.size > 1 && !colsCollapsed && (
            <div className="rounded-lg border bg-muted/10 p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-muted-foreground">
                    {isAr ? "ترتيب الأعمدة (اسحب للترتيب)" : "Column order (drag to reorder)"}
                  </span>
                </Label>
                {colsOrder.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setColsOrder([])}
                    className="h-6 text-xs px-2"
                    data-testid="reset-cols-order"
                  >
                    {isAr ? "استعادة" : "Reset"}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {orderedSelectedCols.map((c, idx) => (
                  <div
                    key={c}
                    draggable
                    onDragStart={() => handleDragStart(c)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(c)}
                    onDragEnd={() => setDragCol(null)}
                    className={
                      "flex items-center gap-1.5 px-2 py-1 text-xs rounded border cursor-move select-none transition-all " +
                      (dragCol === c
                        ? "opacity-50 bg-primary/20 border-primary"
                        : "bg-background border-border hover:border-primary/40 hover:bg-accent/50")
                    }
                    title={isAr ? "اسحب للتغيير" : "Drag to reorder"}
                    data-testid={`drag-col-${c}`}
                  >
                    <span className="text-muted-foreground text-[10px] font-mono">{idx + 1}</span>
                    <span className="text-muted-foreground">⋮⋮</span>
                    <span className="truncate max-w-[140px]">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* مرجع المصفوفة (يظهر فقط في وضع matrix) */}
          {activeTab === "matrix" && (
            <div className="space-y-1">
              <Label className="text-xs">{L.matrixRefLabel}</Label>
              <select
                className="w-full sm:w-auto h-9 rounded-md border bg-background px-2 text-sm"
                value={matrixRef}
                onChange={(e) => setMatrixRef(e.target.value as "first" | "previous" | "raw")}
              >
                <option value="first">{L.refFirst}</option>
                <option value="previous">{L.refPrevious}</option>
                <option value="raw">{L.refRaw}</option>
              </select>
            </div>
          )}

          {/* اختيار الصفوف (مشترك بين matrix و sequential — مخفي في two-rows) */}
          {activeTab !== "two-rows" && (
            <RowSelector
              rows={allRows}
              selected={selectedRowIds}
              toggle={toggleRow}
              selectAll={selectAllRows}
              clear={clearRows}
              rowLabel={rowLabel}
              L={L}
              isAr={isAr}
              collapsed={rowsCollapsed}
              onToggleCollapse={() => setRowsCollapsed((v) => !v)}
            />
          )}

          {/* زر احسب — مباشرة أسفل بوكس الصفوف (matrix + sequential) — في الجهة الأخرى */}
          {activeTab === "matrix" && (
            <div className="flex justify-end">
              <Button
                onClick={runMatrix}
                disabled={!selectedRowIds.size || !selectedCols.size}
                data-testid="button-compute-matrix"
                className="w-full sm:w-auto"
              >
                <GitCompare className="w-4 h-4 me-2" />
                {L.compute}
              </Button>
            </div>
          )}
          {activeTab === "sequential" && (
            <div className="flex justify-end">
              <Button
                onClick={runSequential}
                disabled={selectedRowIds.size < 2 || !selectedCols.size}
                data-testid="button-compute-sequential"
                className="w-full sm:w-auto"
              >
                <GitCompare className="w-4 h-4 me-2" />
                {L.compute}
              </Button>
            </div>
          )}

          {/* الوضع 1: مصفوفة (المحتوى نُقل لأعلى) */}
          <TabsContent value="matrix" className="mt-0" />

          {/* الوضع 2: صفان */}
          <TabsContent value="two-rows" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SingleRowPicker
                label={L.rowA}
                rows={allRows}
                rowLabel={rowLabel}
                value={rowAId}
                onChange={setRowAId}
                L={L}
              />
              <SingleRowPicker
                label={L.rowB}
                rows={allRows}
                rowLabel={rowLabel}
                value={rowBId}
                onChange={setRowBId}
                L={L}
              />
            </div>
            <Button
              onClick={runTwoRows}
              disabled={rowAId === null || rowBId === null || !selectedCols.size}
              data-testid="button-compute-two-rows"
            >
              <GitCompare className="w-4 h-4 me-2" />
              {L.compute}
            </Button>
          </TabsContent>

          {/* الوضع 3: متتالي (المحتوى نُقل لأعلى) */}
          <TabsContent value="sequential" className="mt-0" />
        </Tabs>

        {/* النتائج */}
        {computed && (
          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <Button
                variant={outliersEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setOutliersEnabled((v) => !v)}
                className="h-8 text-xs gap-1.5"
                title={outliersEnabled ? L.outliersOff : L.outliersOn}
                data-testid="button-toggle-outliers"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {outliersEnabled ? L.outliersOff : L.outliersOn}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    if (!canExport) return;
                    exportCompareToExcel(computed, bands, rowLabel, {
                      isAr,
                      datasetName: `dataset-${datasetId}`,
                    });
                  } catch (err) {
                    console.error("Excel export failed", err);
                  }
                }}
                className="h-8 text-xs gap-1.5"
                data-testid="button-export-excel"
                disabled={!canExport}
              >
                <Download className="w-3.5 h-3.5" />
                {L.exportExcel}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    if (!canExport) return;
                    await exportCompareToPDF(computed, bands, {
                      isAr,
                      datasetName: `dataset-${datasetId}`,
                      rowLabel,
                    });
                  } catch (err) {
                    console.error("PDF export failed", err);
                    toast({ description: L.pdfFailed, variant: "destructive", duration: 2500 });
                  }
                }}
                className="h-8 text-xs gap-1.5"
                data-testid="button-export-pdf"
                disabled={!canExport}
              >
                <FileText className="w-3.5 h-3.5" />
                {L.exportPDF}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    if (!canExport) return;
                    exportCompareToCSV(computed, bands, rowLabel, {
                      fileName: `dataset-${datasetId}-compare.csv`,
                    });
                  } catch (err) {
                    console.error("CSV export failed", err);
                  }
                }}
                className="h-8 text-xs gap-1.5"
                data-testid="button-export-csv"
                disabled={!canExport}
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewWindow}
                className="h-8 text-xs gap-1.5"
                data-testid="button-open-new-window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {L.openInNewTab}
              </Button>
            </div>
          {/* عمود التسمية — قابل للطي */}
          <div className="mt-4 rounded-lg border bg-muted/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLabelColCollapsed((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80"
                data-testid="toggle-row-label-collapse"
              >
                {labelColCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
                <span className="text-foreground/80">{L.rowLabelCol}</span>
                {labelCol && (
                  <>
                    <span className="text-muted-foreground">:</span>
                    <span className="text-primary font-bold">{labelCol}</span>
                  </>
                )}
              </button>
              <div className="flex items-center gap-2">
                {/* قائمة منسدلة موحّدة: 4 احتمالات للترتيب */}
                <Select
                  value={`${sortByLabel ? "sort" : "group"}-${sortDir}`}
                  onValueChange={(v) => {
                    const [mode, dir] = v.split("-") as ["sort" | "group", "asc" | "desc"];
                    setSortByLabel(mode === "sort");
                    setSortDir(dir);
                  }}
                >
                  <SelectTrigger
                    className={`h-7 text-xs px-2.5 gap-1.5 w-auto min-w-[180px] ${sortByLabel ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700" : "bg-blue-100 hover:bg-blue-200 text-blue-900 border-2 border-blue-400 dark:bg-blue-950 dark:text-blue-200"}`}
                    onClick={(e) => e.stopPropagation()}
                    data-testid="sort-mode-select"
                  >
                    <ArrowDownUp className="w-3.5 h-3.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent onClick={(e) => e.stopPropagation()}>
                    <SelectItem value="sort-asc">
                      {isAr ? "ترتيب بحسب القياس: XS → S → M → L → XL" : "By size: XS → S → M → L → XL"}
                    </SelectItem>
                    <SelectItem value="sort-desc">
                      {isAr ? "ترتيب بحسب القياس: XL → L → M → S → XS" : "By size: XL → L → M → S → XS"}
                    </SelectItem>
                    <SelectItem value="group-asc">
                      {isAr ? "ترتيب تصاعدي (الأصلي)" : "Ascending (original order)"}
                    </SelectItem>
                    <SelectItem value="group-desc">
                      {isAr ? "ترتيب تنازلي (الأصلي)" : "Descending (original order)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {labelCol && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLabelCol("");
                      setLabelColCollapsed(false);
                    }}
                    className="h-6 text-xs px-2"
                    data-testid="clear-row-label-col"
                  >
                    {L.clear}
                  </Button>
                )}
              </div>
            </div>
            {!labelColCollapsed && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1 thin-scrollbar">
                {columns.map((c) => {
                  const active = labelCol === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setLabelCol(active ? "" : c);
                      }}
                      className={
                        "text-xs px-2.5 py-2 rounded-md border text-start truncate transition-all duration-150 " +
                        (active
                          ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/30 font-semibold"
                          : "bg-background hover:bg-accent hover:border-primary/40 border-border/60")
                      }
                      title={c}
                      data-testid={`btn-row-label-${c}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
            <ResultsTable
              computed={computed}
              bands={bands}
              rowLabel={rowLabel}
              L={L}
              isAr={isAr}
              outliersEnabled={outliersEnabled}
              outlierMethod={outlierMethod}
            />
          </div>
        )}

        {/* عتبات الألوان (نُقلت تحت النتائج لتسريع الوصول للنتيجة) */}
        <ColorBandsEditor bands={bands} setBands={setBands} L={L} />
      </CardContent>
    </Card>
  );
}

function RowSelector({
  rows,
  selected,
  toggle,
  selectAll,
  clear,
  rowLabel,
  L,
  isAr,
  collapsed,
  onToggleCollapse,
}: {
  rows: Row[];
  selected: Set<number>;
  toggle: (id: number) => void;
  selectAll: () => void;
  clear: () => void;
  rowLabel: (r: Row) => string;
  L: any;
  isAr?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => rowLabel(r).toLowerCase().includes(q));
  }, [rows, search, rowLabel]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  const selectAllFiltered = () => {
    filtered.forEach((r) => {
      if (!selected.has(r.id)) toggle(r.id);
    });
  };

  const selectedRowsList = rows.filter((r) => selected.has(r.id));

  // طي تلقائي عند الضغط خارج الصندوق إذا كان توجد صفوف محددة والصندوق مفتوح
  useEffect(() => {
    if (collapsed || !selected.size || !onToggleCollapse) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        // تجاهل إذا تم الضغط داخل portal/dialog/popover/dropdown (خارج container لكن جزء من UI المكوّن)
        const el = target as HTMLElement;
        if (el && el.closest && el.closest('[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]')) {
          return;
        }
        onToggleCollapse();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [collapsed, selected.size, onToggleCollapse]);

  return (
    <div ref={containerRef} className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 text-sm font-bold hover:opacity-80"
          data-testid="toggle-rows-collapse"
        >
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
          <Rows3 className="w-3.5 h-3.5" />
          {L.selectRows} ({selected.size}/{rows.length})
        </button>
        {!collapsed && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={search.trim() ? selectAllFiltered : selectAll}
              className="h-7 text-xs"
              title={search.trim() ? (L.selectAllFiltered || L.selectAll) : L.selectAll}
            >
              <CheckSquare className="w-3.5 h-3.5 me-1" />
              {search.trim() ? (L.selectAllFiltered || L.selectAll) : L.selectAll}
            </Button>
            <Button variant="ghost" size="sm" onClick={clear} className="h-7 text-xs">
              <Square className="w-3.5 h-3.5 me-1" />
              {L.clear}
            </Button>
          </div>
        )}
      </div>
      {collapsed ? (
        <div className="flex flex-wrap gap-1">
          {selectedRowsList.slice(0, 12).map((r) => (
            <span
              key={r.id}
              className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 truncate max-w-[140px]"
              title={rowLabel(r)}
            >
              {rowLabel(r)}
            </span>
          ))}
          {selectedRowsList.length > 12 && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
              +{selectedRowsList.length - 12}
            </span>
          )}
          {selectedRowsList.length === 0 && (
            <span className="text-[11px] text-muted-foreground">
              {isAr ? "لم يتم اختيار صفوف" : "No rows selected"}
            </span>
          )}
        </div>
      ) : (
        <>
      <Input
        placeholder={L.searchRows || "ابحث عن صف..."}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setVisibleCount(500);
        }}
        className="h-9 text-sm font-medium"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-60 overflow-auto">
        {visible.map((r) => (
          <label
            key={r.id}
            className="flex items-center gap-2 text-sm font-semibold cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
          >
            <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
            <span className="truncate" title={rowLabel(r)}>{rowLabel(r)}</span>
          </label>
        ))}
      </div>
      {hasMore && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {L.showing || "يعرض"} {visible.length} / {filtered.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((c) => c + 500)}
            className="h-7 text-xs"
          >
            {L.showMore || "عرض 500 إضافي"}
          </Button>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function SingleRowPicker({
  label,
  rows,
  rowLabel,
  value,
  onChange,
  L,
}: {
  label: string;
  rows: Row[];
  rowLabel: (r: Row) => string;
  value: number | null;
  onChange: (id: number | null) => void;
  L: any;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return rows.slice(0, 1000);
    const q = search.toLowerCase();
    return rows.filter((r) => rowLabel(r).toLowerCase().includes(q)).slice(0, 1000);
  }, [rows, search, rowLabel]);

  const currentLabel =
    value !== null ? (rows.find((r) => r.id === value) && rowLabel(rows.find((r) => r.id === value)!)) : null;

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        placeholder={L.searchRows || "ابحث..."}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-xs"
      />
      <select
        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">--</option>
        {value !== null && currentLabel && !filtered.find((r) => r.id === value) && (
          <option value={value}>{currentLabel}</option>
        )}
        {filtered.map((r) => (
          <option key={r.id} value={r.id}>{rowLabel(r)}</option>
        ))}
      </select>
      {rows.length > 1000 && !search.trim() && (
        <p className="text-[10px] text-muted-foreground">
          {L.showing || "يعرض"} 1000 / {rows.length} — {L.useSearch || "استخدم البحث"}
        </p>
      )}
    </div>
  );
}

// تحويل hex → hsl سريع (لعدم تعقيد input color)
function pickContrastingFg(bg: string): string {
  // إذا بدأ بـ hsl استخرج L
  const hslMatch = bg.match(/hsl\([^,]+,[^,]+,\s*(\d+(?:\.\d+)?)%/);
  if (hslMatch) {
    const l = parseFloat(hslMatch[1]);
    return l > 55 ? "hsl(0,0%,12%)" : "#ffffff";
  }
  // hex
  if (bg.startsWith("#")) {
    const hex = bg.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? "#1a1a1a" : "#ffffff";
  }
  return "#1a1a1a";
}

function ColorBandsEditor({
  bands,
  setBands,
  L,
}: {
  bands: ColorBand[];
  setBands: (b: ColorBand[]) => void;
  L: any;
}) {
  // فرز تنازلي للعرض (الأعلى أولاً)
  const sorted = [...bands].sort((a, b) => b.minDiff - a.minDiff);

  const updateBand = (id: string, patch: Partial<ColorBand>) => {
    setBands(bands.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBand = (id: string) => {
    setBands(bands.filter((b) => b.id !== id));
  };

  const addBand = () => {
    // ابحث عن أعلى minDiff غير -Infinity وأضف +0.5
    const finite = bands.filter((b) => isFinite(b.minDiff));
    const maxMin = finite.length ? Math.max(...finite.map((b) => b.minDiff)) : 0;
    const newBand: ColorBand = {
      id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      minDiff: maxMin + 0.5,
      bg: "#7c3aed", // بنفسجي افتراضي
      fg: "#ffffff",
      label: L.bandLabel,
    };
    setBands([...bands, newBand]);
  };

  const resetBands = () => setBands(DEFAULT_BANDS);

  return (
    <div className="mt-3 rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-xs font-semibold">{L.thresholds}</Label>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={addBand} className="h-7 text-xs gap-1">
            <Plus className="w-3.5 h-3.5" />
            {L.addColor}
          </Button>
          <Button variant="ghost" size="sm" onClick={resetBands} className="h-7 text-xs gap-1">
            <RotateCcw className="w-3 h-3" />
            {L.resetColors}
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">{L.redHint}</p>
      <div className="space-y-1.5">
        {sorted.map((band) => {
          const isFallback = !isFinite(band.minDiff);
          return (
            <div
              key={band.id}
              className="flex items-center gap-1.5 flex-wrap rounded-md border bg-background p-1.5"
              style={{ borderLeft: `4px solid ${band.bg}` }}
            >
              <input
                type="color"
                value={band.bg.startsWith("#") ? band.bg : hslToHex(band.bg)}
                onChange={(e) =>
                  updateBand(band.id, { bg: e.target.value, fg: pickContrastingFg(e.target.value) })
                }
                className="w-8 h-8 rounded cursor-pointer border"
                title={L.bandBg}
              />
              <Input
                value={band.label}
                onChange={(e) => updateBand(band.id, { label: e.target.value })}
                className="h-8 text-xs flex-1 min-w-[100px]"
                placeholder={L.bandLabel}
              />
              {isFallback ? (
                <span className="text-[10px] text-muted-foreground px-2">{L.fallbackColor}</span>
              ) : (
                <div className="flex items-center gap-1">
                  <Label className="text-[11px]">{L.bandMin}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={band.minDiff}
                    onChange={(e) =>
                      updateBand(band.id, { minDiff: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 w-20 text-xs"
                  />
                </div>
              )}
              <div
                className="h-8 px-3 rounded text-xs font-bold flex items-center"
                style={{ background: band.bg, color: band.fg }}
              >
                {fmt(isFallback ? -99 : band.minDiff)}
              </div>
              {!isFallback && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBand(band.id)}
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  title={L.removeColor}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// تحويل hsl(h,s%,l%) → #hex (بسيط)
function hslToHex(hsl: string): string {
  const m = hsl.match(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%/);
  if (!m) return "#888888";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface ComputedShape {
  mode: "two-rows" | "matrix" | "sequential";
  rows: Row[];
  cols: string[];
  rowA?: Row;
  rowB?: Row;
  matrixRef?: "first" | "previous" | "raw";
}

export function ResultsTable({
  computed,
  bands,
  rowLabel,
  L,
  isAr = true,
  outliersEnabled = false,
  outlierMethod = "iqr",
}: {
  computed: ComputedShape;
  bands: ColorBand[];
  rowLabel: (r: Row) => string;
  L: any;
  isAr?: boolean;
  outliersEnabled?: boolean;
  outlierMethod?: OutlierMethod;
}) {
  const { mode, rows, cols, rowA, rowB, matrixRef } = computed;

  // ✅ TOOLTIP الغني — state لمحتوى Tooltip الكبير عند الـ hover على خلية
  type HoverInfo = {
    measure: string;
    rowLabel: string;
    current: string;
    refLabel?: string;
    refValue?: string;
    diff?: string;
    pct?: string;
    isOutlier: boolean;
    x: number;
    y: number;
  } | null;
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>(null);
  // معرّف الخلية المفتوحة حالياً للتبديل عند الضغط مرة أخرى
  const [openCellKey, setOpenCellKey] = useState<string | null>(null);
  // موقع البوكس المخصص (إن تم سحبه) — null = الموقع التلقائي
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  // حجم البوكس المخصص (إن تم تغييره) — null = الحجم الافتراضي
  const [tooltipSize, setTooltipSize] = useState<{ w: number; h: number } | null>(null);
  // حالة السحب وتغيير الحجم
  const dragStateRef = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null);
  const resizeStateRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // عند الضغط على خلية: إن كانت نفسها مفتوحة → اغلق، وإلا افتح بمعلوماتها
  const toggleCell = (key: string, info: NonNullable<HoverInfo>) => {
    if (openCellKey === key) {
      setOpenCellKey(null);
      setHoverInfo(null);
      setTooltipPos(null);
      setTooltipSize(null);
    } else {
      setOpenCellKey(key);
      setHoverInfo(info);
      // الحفاظ على الموقع والحجم المخصصين عبر الخلايا — لا يعاد الضبط إلا عند الإغلاق
    }
  };
  const closeCell = () => {
    setOpenCellKey(null);
    setHoverInfo(null);
    setTooltipPos(null);
    setTooltipSize(null);
  };

  // إغلاق البوكس بضغطة Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCell();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 📝 Tooltip Overlay — صندوق أفقي عريض يعرض تفاصيل الخلية في صف واحد
  const tooltipOverlay = hoverInfo ? (() => {
    const TOOLTIP_W = tooltipSize?.w ?? 920;
    const TOOLTIP_H = tooltipSize?.h ?? 130;
    const margin = 12;
    let left: number;
    let top: number;
    if (tooltipPos) {
      left = tooltipPos.x;
      top = tooltipPos.y;
    } else {
      left = hoverInfo.x + 18;
      top = hoverInfo.y + 18;
      if (typeof window !== "undefined") {
        if (left + TOOLTIP_W + margin > window.innerWidth) {
          left = Math.max(margin, hoverInfo.x - TOOLTIP_W - 18);
        }
        if (top + TOOLTIP_H + margin > window.innerHeight) {
          top = Math.max(margin, hoverInfo.y - TOOLTIP_H - 18);
        }
      }
    }
    // لون الفرق ديناميكياً
    const diffNum = hoverInfo.diff ? parseFloat(hoverInfo.diff) : NaN;
    const diffColor = isNaN(diffNum) || diffNum === 0
      ? "text-slate-700 dark:text-slate-100"
      : diffNum > 0
        ? "text-emerald-800 dark:text-emerald-200"
        : "text-rose-800 dark:text-rose-200";
    const diffBg = isNaN(diffNum) || diffNum === 0
      ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500"
      : diffNum > 0
        ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-500"
        : "bg-rose-100 dark:bg-rose-950 border-rose-500";
    return (
      <div
        className={`fixed z-[9999] pointer-events-auto rounded-xl border-[3px] border-slate-900 dark:border-white shadow-2xl px-4 pt-7 pb-3 overflow-hidden ${isDragging || isResizing ? "cursor-grabbing select-none" : ""}`}
        style={{ left, top, width: TOOLTIP_W, height: tooltipSize?.h ?? "auto", minHeight: 110, maxWidth: "calc(100vw - 24px)", background: "hsl(var(--popover))", boxShadow: "0 30px 60px -10px rgba(0,0,0,0.6)" }}
      >
        {/* شريط السحب العلوي */}
        <div
          className="absolute top-0 inset-x-0 h-6 cursor-grab active:cursor-grabbing flex items-center justify-center gap-1 rounded-t-xl bg-slate-200/70 dark:bg-slate-700/60 hover:bg-slate-300/80 dark:hover:bg-slate-600/80 transition-colors border-b border-slate-300 dark:border-slate-600"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const origLeft = left;
            const origTop = top;
            dragStateRef.current = { startX, startY, origLeft, origTop };
            setIsDragging(true);
            const onMove = (ev: MouseEvent) => {
              const s = dragStateRef.current;
              if (!s) return;
              const nx = s.origLeft + (ev.clientX - s.startX);
              const ny = s.origTop + (ev.clientY - s.startY);
              const maxX = (typeof window !== "undefined" ? window.innerWidth : 1920) - TOOLTIP_W - 4;
              const maxY = (typeof window !== "undefined" ? window.innerHeight : 1080) - 40;
              setTooltipPos({
                x: Math.max(4, Math.min(maxX, nx)),
                y: Math.max(4, Math.min(maxY, ny)),
              });
            };
            const onUp = () => {
              setIsDragging(false);
              dragStateRef.current = null;
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
          title={isAr ? "اسحب لتحريك البوكس" : "Drag to move"}
        >
          <span className="block w-8 h-1 rounded-full bg-slate-500/50 dark:bg-slate-300/40"></span>
          <span className="block w-8 h-1 rounded-full bg-slate-500/50 dark:bg-slate-300/40"></span>
        </div>
        <button
          type="button"
          onClick={closeCell}
          className="absolute top-0.5 end-1 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white flex items-center justify-center text-slate-700 dark:text-slate-100 transition-colors shadow-md z-20"
          aria-label={isAr ? "إغلاق" : "Close"}
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-stretch gap-2 pe-7">
          {/* القياس */}
          <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 border-2 border-blue-500 dark:border-blue-600">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-blue-800 dark:text-blue-200 font-extrabold mb-0.5">
              <span>📌</span>
              <span>{isAr ? "القياس" : "Measure"}</span>
            </div>
            <div className="text-base font-extrabold text-blue-950 dark:text-blue-50 break-words leading-tight">{hoverInfo.measure}</div>
          </div>

          {/* الصف */}
          <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/80 border-2 border-violet-500 dark:border-violet-600">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-violet-800 dark:text-violet-200 font-extrabold mb-0.5">
              <span>📍</span>
              <span>{isAr ? "الصف" : "Row"}</span>
            </div>
            <div className="text-base font-extrabold text-violet-950 dark:text-violet-50 break-words leading-tight">{hoverInfo.rowLabel}</div>
          </div>

          {/* القيمة الحالية */}
          <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-500 dark:border-amber-600">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-200 font-extrabold mb-0.5">
              <span>🔢</span>
              <span>{isAr ? "الحالية" : "Current"}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-black text-amber-950 dark:text-amber-50 tabular-nums leading-none">{hoverInfo.current}</span>
              <span className="text-[11px] text-amber-800 dark:text-amber-300 truncate font-extrabold">{hoverInfo.rowLabel}</span>
            </div>
          </div>

          {/* القيمة المرجعية */}
          {hoverInfo.refValue !== undefined && (
            <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/80 border-2 border-cyan-500 dark:border-cyan-600">
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-cyan-800 dark:text-cyan-200 font-extrabold mb-0.5">
                <span>📊</span>
                <span>{isAr ? "المرجعية" : "Reference"}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-black text-cyan-950 dark:text-cyan-50 tabular-nums leading-none">{hoverInfo.refValue}</span>
                {hoverInfo.refLabel && (
                  <span className="text-[11px] text-cyan-800 dark:text-cyan-300 truncate font-extrabold">{hoverInfo.refLabel}</span>
                )}
              </div>
            </div>
          )}

          {/* الفرق + النسبة */}
          {hoverInfo.diff !== undefined && (
            <div className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border-2 ${diffBg}`}>
              <div className={`flex items-center gap-1 text-[11px] uppercase tracking-wider font-extrabold mb-0.5 ${diffColor}`}>
                <span className="text-base">Δ</span>
                <span>{isAr ? "الفرق" : "Difference"}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-[26px] font-black tabular-nums leading-none ${diffColor}`}>{hoverInfo.diff}</span>
                {hoverInfo.pct && (
                  <span className={`text-[12px] font-extrabold ${diffColor}`}>{hoverInfo.pct}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* مقبض تغيير الحجم — الزاوية السفلية اليسرى (start في RTL) */}
        <div
          className="absolute bottom-0 start-0 w-5 h-5 cursor-nesw-resize z-20 group"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const origW = TOOLTIP_W;
            const origH = typeof tooltipSize?.h === "number" ? tooltipSize.h : (e.currentTarget.parentElement?.getBoundingClientRect().height ?? 130);
            resizeStateRef.current = { startX, startY, origW, origH };
            setIsResizing(true);
            const onMove = (ev: MouseEvent) => {
              const s = resizeStateRef.current;
              if (!s) return;
              // في RTL: الزاوية السفلية اليسرى — السحب لليسار يكبر العرض، للأسفل يكبر الارتفاع
              const dx = s.startX - ev.clientX; // عكس لأن المقبض يسار
              const dy = ev.clientY - s.startY;
              const newW = Math.max(420, Math.min(window.innerWidth - 20, s.origW + dx));
              const newH = Math.max(110, Math.min(window.innerHeight - 20, s.origH + dy));
              setTooltipSize({ w: newW, h: newH });
            };
            const onUp = () => {
              setIsResizing(false);
              resizeStateRef.current = null;
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
          title={isAr ? "اسحب لتغيير الحجم" : "Drag to resize"}
        >
          <svg viewBox="0 0 16 16" className="w-full h-full text-slate-500 dark:text-slate-300 opacity-60 group-hover:opacity-100 transition-opacity">
            <path d="M2 14 L14 14 M2 14 L2 10 M5 14 L5 7 M8 14 L8 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
        </div>

        {hoverInfo.isOutlier && (
          <div className="flex items-center gap-2 mt-2 pt-1.5 border-t-2 border-amber-500">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-extrabold text-amber-800 dark:text-amber-300">
              {isAr ? "قيمة شاذة تحتاج مراجعة" : "Outlier value needs review"}
            </span>
          </div>
        )}
      </div>
    );
  })() : null;

  // حساب فهارس القيم الشاذة لكل عمود (في وضع المصفوفة)
  const outliersByCol = useMemo(() => {
    if (!outliersEnabled || mode !== "matrix") return new Map<string, Set<number>>();
    const map = new Map<string, Set<number>>();
    for (const c of cols) {
      const values = rows.map((r) => extractNumber(r.data[c]));
      const { indices } = detectOutliers(values, outlierMethod, 2);
      map.set(c, indices);
    }
    return map;
  }, [outliersEnabled, outlierMethod, mode, cols, rows]);

  // حساب فهارس الصفوف الشاذة في وضع two-rows (على الأعمدة)
  const twoRowOutliers = useMemo(() => {
    if (!outliersEnabled || mode !== "two-rows" || !rowA || !rowB) return new Set<string>();
    const diffs = cols.map((c) => extractNumber(rowB.data[c]) - extractNumber(rowA.data[c]));
    const { indices } = detectOutliers(diffs, outlierMethod, 2);
    const set = new Set<string>();
    indices.forEach((i) => set.add(cols[i]));
    return set;
  }, [outliersEnabled, outlierMethod, mode, cols, rowA, rowB]);

  // وضع 1: صفان
  if (mode === "two-rows" && rowA && rowB) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground/80">{L.diffFormula}</p>
        <div className="overflow-auto border rounded-md">
          <table className="w-full text-sm border-separate border-spacing-0 [&_th]:border [&_td]:border [&_th]:border-border/60 [&_td]:border-border/60">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary">{L.column}</th>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary">{rowLabel(rowA)}</th>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary">{rowLabel(rowB)}</th>
                <th className="px-3 py-2 text-center border-b-[3px] border-b-primary">{L.diff}</th>
              </tr>
            </thead>
            <tbody>
              {cols.map((c) => {
                const a = extractNumber(rowA.data[c]);
                const b = extractNumber(rowB.data[c]);
                const diff = !isNaN(a) && !isNaN(b) ? b - a : NaN;
                const { bg, fg } = colorForDiff(diff, bands);
                // لو العمود نصي بطبيعته، اعرض القيمة الأصلية بدل "—"
                const bothText = isNaN(a) && isNaN(b);
                const diffText = bothText
                  ? String(rowB.data[c] ?? rowA.data[c] ?? "")
                  : fmt(diff);
                const isOut = twoRowOutliers.has(c);
                return (
                  <tr key={c} className="border-b last:border-b-0">
                    <td className={`px-3 py-1.5 text-center font-semibold bg-muted/40 ${isOut ? "ring-2 ring-amber-500 ring-inset" : ""}`}>
                      {isOut && <AlertTriangle className="w-3 h-3 inline me-1 text-amber-600" />}
                      {c}
                    </td>
                    <td className="px-3 py-1.5 text-center tabular-nums">{isNaN(a) ? String(rowA.data[c] ?? "—") : a}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums">{isNaN(b) ? String(rowB.data[c] ?? "—") : b}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums font-bold" style={{ background: bg, color: fg }}>
                      {diffText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // وضع 2: مصفوفة
  if (mode === "matrix") {
    const ref = matrixRef ?? "first";
    const headerNote =
      ref === "first"
        ? L.refFirst
        : ref === "previous"
        ? L.refPrevious
        : L.refRaw;
    return (
      <>
      {tooltipOverlay}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground/80">
          {ref === "raw" ? L.rawValues : `${L.matrixRefLabel}: ${headerNote}`}
        </p>
        <div className="overflow-auto border rounded-md">
          <table className="w-full text-sm border-separate border-spacing-0 [&_th]:border [&_td]:border [&_th]:border-border/60 [&_td]:border-border/60">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-3 py-2.5 text-center text-base font-bold border-b-[3px] border-b-primary sticky start-0 bg-primary z-10">
                  {L.row}
                </th>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-center text-base font-bold border-b-[3px] border-b-primary whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5 text-center font-semibold bg-muted/40 sticky start-0 z-[1]">
                    {rowLabel(r)}
                  </td>
                  {cols.map((c) => {
                    const v = extractNumber(r.data[c]);
                    let diff = NaN;
                    let displayText = "—";
                    let diffPart: string | null = null;
                    let valuePart: string = "—";

                    if (ref === "raw") {
                      // عرض القيمة الخام + تلوين حسب العتبات
                      diff = v;
                      displayText = isNaN(v) ? String(r.data[c] ?? "—") : String(v);
                    } else if (ref === "first") {
                      if (i === 0) {
                        // الصف الأول هو المرجع
                        displayText = isNaN(v) ? String(r.data[c] ?? "—") : String(v);
                        return (
                          <td
                            key={c}
                            className="px-3 py-1.5 text-center tabular-nums font-bold bg-muted/30"

                          >
                            {displayText}
                          </td>
                        );
                      }
                      const base = extractNumber(rows[0].data[c]);
                      diff = !isNaN(base) && !isNaN(v) ? v - base : NaN;
                      // لو العمود نصي (لا يحتوي أرقام)، عرض القيمة الأصلية ثابتة
                      if (isNaN(diff)) {
                        displayText = isNaN(v)
                          ? String(r.data[c] ?? "")
                          : String(v);
                        valuePart = displayText;
                      } else {
                        displayText = `${fmt(diff)} (${v})`;
                        diffPart = fmt(diff);
                        valuePart = String(v);
                      }
                    } else if (ref === "previous") {
                      if (i === 0) {
                        displayText = isNaN(v) ? String(r.data[c] ?? "—") : String(v);
                        return (
                          <td
                            key={c}
                            className="px-3 py-1.5 text-center tabular-nums font-bold bg-muted/30"
                          >
                            {displayText}
                          </td>
                        );
                      }
                      const prev = extractNumber(rows[i - 1].data[c]);
                      diff = !isNaN(prev) && !isNaN(v) ? v - prev : NaN;
                      if (isNaN(diff)) {
                        displayText = isNaN(v)
                          ? String(r.data[c] ?? "")
                          : String(v);
                        valuePart = displayText;
                      } else {
                        displayText = `${fmt(diff)} (${v})`;
                        diffPart = fmt(diff);
                        valuePart = String(v);
                      }
                    }

                    const { bg, fg } = colorForDiff(diff, bands);
                    const isOut = outliersByCol.get(c)?.has(i) ?? false;
                    const refRowForCell = ref === "first" ? rows[0] : (ref === "previous" && i > 0 ? rows[i - 1] : null);
                    const refRowName = refRowForCell ? rowLabel(refRowForCell) : "";
                    return (
                      <td
                        key={c}
                        className={`px-3 py-3 text-center tabular-nums whitespace-nowrap relative cursor-pointer transition-all ${isOut ? "ring-2 ring-amber-500 ring-inset" : ""} ${openCellKey === `m-${r.id}-${c}` ? "ring-[4px] ring-sky-500 ring-inset shadow-[0_0_0_3px_rgba(14,165,233,0.45),inset_0_0_0_2px_white] z-20 outline outline-2 outline-sky-900" : ""}`}
                        style={{ background: bg, color: fg }}
                        onClick={(e) => {
                          const refRow = ref === "first" ? rows[0] : (ref === "previous" && i > 0 ? rows[i - 1] : null);
                          const baseVal = ref === "first" ? extractNumber(rows[0].data[c]) : (ref === "previous" && i > 0 ? extractNumber(rows[i - 1].data[c]) : NaN);
                          const pctStr = (diffPart !== null && !isNaN(baseVal) && baseVal !== 0)
                            ? `${diff > 0 ? "+" : ""}${((diff / baseVal) * 100).toFixed(1)}%`
                            : undefined;
                          toggleCell(`m-${r.id}-${c}`, {
                            measure: c,
                            rowLabel: rowLabel(r),
                            current: valuePart,
                            refLabel: refRow ? rowLabel(refRow) : undefined,
                            refValue: refRow && !isNaN(baseVal) ? String(baseVal) : undefined,
                            diff: diffPart ?? undefined,
                            pct: pctStr,
                            isOutlier: isOut,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                      >
                        {isOut && <AlertTriangle className="w-3 h-3 absolute top-1 end-1" />}
                        {diffPart !== null ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[18px] font-bold tabular-nums leading-none">{diffPart}</span>
                            <span className="text-[10px] opacity-55 font-medium tabular-nums leading-none mt-1.5 uppercase tracking-wider">{valuePart}</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-sm">{displayText}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
    );
  }

  // وضع 3: متتالي (كل صف − الصف السابق)
  if (mode === "sequential") {
    return (
      <>
      {tooltipOverlay}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground/80">{L.sequentialFormula}</p>
        <div className="overflow-auto border rounded-md">
          <table className="w-full text-sm border-separate border-spacing-0 [&_th]:border [&_td]:border [&_th]:border-border/60 [&_td]:border-border/60">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-3 py-2.5 text-center text-base font-bold border-b-[3px] border-b-primary sticky start-0 bg-primary z-10">
                  {L.row}
                </th>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-center text-base font-bold border-b-[3px] border-b-primary whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5 text-center font-semibold bg-muted/40 sticky start-0 z-[1]">
                    {rowLabel(r)}
                  </td>
                  {cols.map((c) => {
                    if (i === 0) {
                      // أول صف ليس له فرق — اعرض القيمة الأصلية
                      const v = r.data[c];
                      return (
                        <td key={c} className="px-3 py-1.5 text-center text-muted-foreground">
                          {v === null || v === undefined || v === "" ? "—" : String(v)}
                        </td>
                      );
                    }
                    const prev = extractNumber(rows[i - 1].data[c]);
                    const curr = extractNumber(r.data[c]);
                    const diff = !isNaN(prev) && !isNaN(curr) ? curr - prev : NaN;
                    const { bg, fg } = colorForDiff(diff, bands);
                    return (
                      <td
                        key={c}
                        className={`px-3 py-3 text-center tabular-nums cursor-pointer transition-all ${openCellKey === `s-${r.id}-${c}` ? "ring-[4px] ring-sky-500 ring-inset shadow-[0_0_0_3px_rgba(14,165,233,0.45),inset_0_0_0_2px_white] z-20 outline outline-2 outline-sky-900" : ""}`}
                        style={{ background: bg, color: fg }}
                        onClick={(e) => {
                          const pctStr = (!isNaN(diff) && prev !== 0)
                            ? `${diff > 0 ? "+" : ""}${((diff / prev) * 100).toFixed(1)}%`
                            : undefined;
                          toggleCell(`s-${r.id}-${c}`, {
                            measure: c,
                            rowLabel: rowLabel(r),
                            current: String(curr),
                            refLabel: rowLabel(rows[i - 1]),
                            refValue: String(prev),
                            diff: !isNaN(diff) ? fmt(diff) : undefined,
                            pct: pctStr,
                            isOutlier: false,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                      >
                        {isNaN(diff) ? (
                          <span className="font-semibold text-sm">{fmt(diff)}</span>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[18px] font-bold tabular-nums leading-none">{fmt(diff)}</span>
                            <span className="text-[10px] opacity-55 font-medium tabular-nums leading-none mt-1.5 uppercase tracking-wider">{curr}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
    );
  }

  return null;
}
