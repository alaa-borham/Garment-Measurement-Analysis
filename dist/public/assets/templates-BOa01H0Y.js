import { c as createLucideIcon, r as reactExports, L as LangContext, h as useToast, u as useLocation, j as jsxRuntimeExports, a0 as FileText, a1 as Shirt, R as Ruler, C as Card, k as CardHeader, m as Badge, l as CardTitle, a as CardContent, B as Button, _ as Download } from "./index-klzEDF9_.js";
const Settings = createLucideIcon("Settings", [
  [
    "path",
    {
      d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
      key: "1qme2f"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);
const Trees = createLucideIcon("Trees", [
  ["path", { d: "M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z", key: "1l6gj6" }],
  ["path", { d: "M7 16v6", key: "1a82de" }],
  ["path", { d: "M13 19v3", key: "13sx9i" }],
  [
    "path",
    {
      d: "M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5",
      key: "1sj9kv"
    }
  ]
]);
const TEMPLATES = [
  {
    id: "garment-shirt",
    name: { ar: "قياسات قميص", en: "Shirt Measurements" },
    description: {
      ar: "قالب قياسات قميص قياسي (الصدر، الكتف، الطول، الكم)",
      en: "Standard shirt measurements (chest, shoulder, length, sleeve)"
    },
    category: "garment",
    icon: Shirt,
    columns: [
      { name: "Size", type: "text" },
      { name: "Chest", type: "number", unit: "cm" },
      { name: "Shoulder", type: "number", unit: "cm" },
      { name: "Length", type: "number", unit: "cm" },
      { name: "Sleeve", type: "number", unit: "cm" }
    ],
    sampleRows: [
      { Size: "S", Chest: 96, Shoulder: 42, Length: 68, Sleeve: 60 },
      { Size: "M", Chest: 100, Shoulder: 44, Length: 70, Sleeve: 62 },
      { Size: "L", Chest: 104, Shoulder: 46, Length: 72, Sleeve: 64 },
      { Size: "XL", Chest: 110, Shoulder: 48, Length: 74, Sleeve: 66 }
    ]
  },
  {
    id: "garment-pants",
    name: { ar: "قياسات بنطلون", en: "Pants Measurements" },
    description: {
      ar: "قالب قياسات بنطلون (الخصر، الورك، الطول، الفخذ)",
      en: "Pants measurements (waist, hip, length, thigh)"
    },
    category: "garment",
    icon: Shirt,
    columns: [
      { name: "Size", type: "text" },
      { name: "Waist", type: "number", unit: "cm" },
      { name: "Hip", type: "number", unit: "cm" },
      { name: "Length", type: "number", unit: "cm" },
      { name: "Thigh", type: "number", unit: "cm" }
    ],
    sampleRows: [
      { Size: "S", Waist: 76, Hip: 96, Length: 102, Thigh: 56 },
      { Size: "M", Waist: 80, Hip: 100, Length: 104, Thigh: 58 },
      { Size: "L", Waist: 84, Hip: 104, Length: 106, Thigh: 60 }
    ]
  },
  {
    id: "cad-dxf",
    name: { ar: "إحداثيات CAD/DXF", en: "CAD/DXF Coordinates" },
    description: {
      ar: "نقاط CAD ثنائية/ثلاثية الأبعاد (X, Y, Z, Layer)",
      en: "2D/3D CAD points (X, Y, Z, Layer)"
    },
    category: "cad",
    icon: Ruler,
    columns: [
      { name: "PointID", type: "text" },
      { name: "X", type: "number", unit: "mm" },
      { name: "Y", type: "number", unit: "mm" },
      { name: "Z", type: "number", unit: "mm" },
      { name: "Layer", type: "text" }
    ],
    sampleRows: [
      { PointID: "P1", X: 0, Y: 0, Z: 0, Layer: "Outline" },
      { PointID: "P2", X: 100, Y: 0, Z: 0, Layer: "Outline" },
      { PointID: "P3", X: 100, Y: 50, Z: 0, Layer: "Outline" }
    ]
  },
  {
    id: "petro",
    name: { ar: "بيانات بتروكيماوية", en: "Petrochemical Data" },
    description: {
      ar: "قياسات أنابيب بتروكيماوية (القطر، الضغط، التدفق)",
      en: "Petrochemical pipe measurements (diameter, pressure, flow)"
    },
    category: "industrial",
    icon: Trees,
    columns: [
      { name: "PipeID", type: "text" },
      { name: "Diameter", type: "number", unit: "mm" },
      { name: "Pressure", type: "number", unit: "bar" },
      { name: "FlowRate", type: "number", unit: "m3/h" },
      { name: "Material", type: "text" }
    ],
    sampleRows: [
      { PipeID: "PP-001", Diameter: 250, Pressure: 16, FlowRate: 120, Material: "Steel" },
      { PipeID: "PP-002", Diameter: 300, Pressure: 20, FlowRate: 180, Material: "Steel" }
    ]
  },
  {
    id: "qc-general",
    name: { ar: "ضبط الجودة العام", en: "General Quality Control" },
    description: {
      ar: "قياسات ضبط الجودة مع التفاوت المسموح",
      en: "QC measurements with tolerance"
    },
    category: "general",
    icon: Settings,
    columns: [
      { name: "Sample", type: "text" },
      { name: "Measurement", type: "number", unit: "mm" },
      { name: "Target", type: "number", unit: "mm" },
      { name: "Tolerance", type: "number", unit: "mm" },
      { name: "Status", type: "text" }
    ],
    sampleRows: [
      { Sample: "S001", Measurement: 10.05, Target: 10, Tolerance: 0.1, Status: "OK" },
      { Sample: "S002", Measurement: 10.15, Target: 10, Tolerance: 0.1, Status: "OUT" }
    ]
  }
];
function TemplatesPage() {
  const { lang } = reactExports.useContext(LangContext);
  const isAr = lang === "ar";
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [creating, setCreating] = reactExports.useState(null);
  const downloadCSV = (tpl) => {
    const header = tpl.columns.map((c) => c.name).join(",");
    const rows = tpl.sampleRows.map(
      (r) => tpl.columns.map((c) => r[c.name] ?? "").join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tpl.id}-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: isAr ? "تم تنزيل القالب" : "Template downloaded" });
  };
  const createDataset = async (tpl) => {
    setCreating(tpl.id);
    try {
      const header = tpl.columns.map((c) => c.name).join(",");
      const rows = tpl.sampleRows.map(
        (r) => tpl.columns.map((c) => r[c.name] ?? "").join(",")
      );
      const csv = [header, ...rows].join("\n");
      const file = new File([csv], `${tpl.id}.csv`, { type: "text/csv" });
      const form = new FormData();
      form.append("file", file);
      form.append("name", isAr ? tpl.name.ar : tpl.name.en);
      const token = localStorage.getItem("qiyasat_auth_token");
      const res = await fetch("/api/datasets/upload", {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: isAr ? "تم إنشاء الملف" : "Dataset created" });
        navigate(`/datasets/${data.id}`);
      } else {
        toast({
          title: isAr ? "فشل الإنشاء" : "Creation failed",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: isAr ? "خطأ في الشبكة" : "Network error",
        variant: "destructive"
      });
    }
    setCreating(null);
  };
  const categoryLabel = (cat) => {
    if (cat === "garment") return isAr ? "ملابس" : "Garment";
    if (cat === "cad") return "CAD";
    if (cat === "industrial") return isAr ? "صناعي" : "Industrial";
    return isAr ? "عام" : "General";
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-6 h-6" }),
        isAr ? "قوالب جاهزة" : "Templates"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm mt-1", children: isAr ? "ابدأ بسرعة بقالب قياسات جاهز (CAD، ملابس، بتروكيماويات، ضبط جودة)" : "Quick-start with a ready measurement template" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: TEMPLATES.map((tpl) => {
      const Icon = tpl.icon;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-5 h-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: categoryLabel(tpl.category) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base mt-2", children: isAr ? tpl.name.ar : tpl.name.en })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex-1 flex flex-col gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground flex-1", children: isAr ? tpl.description.ar : tpl.description.en }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
              isAr ? "الأعمدة:" : "Columns:",
              " "
            ] }),
            tpl.columns.map((c) => c.name).join(", ")
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                onClick: () => createDataset(tpl),
                disabled: creating === tpl.id,
                className: "flex-1",
                children: creating === tpl.id ? isAr ? "جارٍ..." : "Creating..." : isAr ? "إنشاء ملف" : "Create"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => downloadCSV(tpl), className: "gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3 h-3" }),
              "CSV"
            ] })
          ] })
        ] })
      ] }, tpl.id);
    }) })
  ] });
}
export {
  TemplatesPage as default
};
//# sourceMappingURL=templates-BOa01H0Y.js.map
