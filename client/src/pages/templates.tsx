import { useContext, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { LangContext } from "@/lib/i18n";
import { FileText, Ruler, Shirt, Trees, Settings, Download } from "lucide-react";

interface Template {
  id: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  category: string;
  icon: any;
  columns: Array<{ name: string; type: "number" | "text"; unit?: string }>;
  sampleRows: Array<Record<string, any>>;
}

const TEMPLATES: Template[] = [
  {
    id: "garment-shirt",
    name: { ar: "قياسات قميص", en: "Shirt Measurements" },
    description: {
      ar: "قالب قياسات قميص قياسي (الصدر، الكتف، الطول، الكم)",
      en: "Standard shirt measurements (chest, shoulder, length, sleeve)",
    },
    category: "garment",
    icon: Shirt,
    columns: [
      { name: "Size", type: "text" },
      { name: "Chest", type: "number", unit: "cm" },
      { name: "Shoulder", type: "number", unit: "cm" },
      { name: "Length", type: "number", unit: "cm" },
      { name: "Sleeve", type: "number", unit: "cm" },
    ],
    sampleRows: [
      { Size: "S", Chest: 96, Shoulder: 42, Length: 68, Sleeve: 60 },
      { Size: "M", Chest: 100, Shoulder: 44, Length: 70, Sleeve: 62 },
      { Size: "L", Chest: 104, Shoulder: 46, Length: 72, Sleeve: 64 },
      { Size: "XL", Chest: 110, Shoulder: 48, Length: 74, Sleeve: 66 },
    ],
  },
  {
    id: "garment-pants",
    name: { ar: "قياسات بنطلون", en: "Pants Measurements" },
    description: {
      ar: "قالب قياسات بنطلون (الخصر، الورك، الطول، الفخذ)",
      en: "Pants measurements (waist, hip, length, thigh)",
    },
    category: "garment",
    icon: Shirt,
    columns: [
      { name: "Size", type: "text" },
      { name: "Waist", type: "number", unit: "cm" },
      { name: "Hip", type: "number", unit: "cm" },
      { name: "Length", type: "number", unit: "cm" },
      { name: "Thigh", type: "number", unit: "cm" },
    ],
    sampleRows: [
      { Size: "S", Waist: 76, Hip: 96, Length: 102, Thigh: 56 },
      { Size: "M", Waist: 80, Hip: 100, Length: 104, Thigh: 58 },
      { Size: "L", Waist: 84, Hip: 104, Length: 106, Thigh: 60 },
    ],
  },
  {
    id: "cad-dxf",
    name: { ar: "إحداثيات CAD/DXF", en: "CAD/DXF Coordinates" },
    description: {
      ar: "نقاط CAD ثنائية/ثلاثية الأبعاد (X, Y, Z, Layer)",
      en: "2D/3D CAD points (X, Y, Z, Layer)",
    },
    category: "cad",
    icon: Ruler,
    columns: [
      { name: "PointID", type: "text" },
      { name: "X", type: "number", unit: "mm" },
      { name: "Y", type: "number", unit: "mm" },
      { name: "Z", type: "number", unit: "mm" },
      { name: "Layer", type: "text" },
    ],
    sampleRows: [
      { PointID: "P1", X: 0, Y: 0, Z: 0, Layer: "Outline" },
      { PointID: "P2", X: 100, Y: 0, Z: 0, Layer: "Outline" },
      { PointID: "P3", X: 100, Y: 50, Z: 0, Layer: "Outline" },
    ],
  },
  {
    id: "petro",
    name: { ar: "بيانات بتروكيماوية", en: "Petrochemical Data" },
    description: {
      ar: "قياسات أنابيب بتروكيماوية (القطر، الضغط، التدفق)",
      en: "Petrochemical pipe measurements (diameter, pressure, flow)",
    },
    category: "industrial",
    icon: Trees,
    columns: [
      { name: "PipeID", type: "text" },
      { name: "Diameter", type: "number", unit: "mm" },
      { name: "Pressure", type: "number", unit: "bar" },
      { name: "FlowRate", type: "number", unit: "m3/h" },
      { name: "Material", type: "text" },
    ],
    sampleRows: [
      { PipeID: "PP-001", Diameter: 250, Pressure: 16, FlowRate: 120, Material: "Steel" },
      { PipeID: "PP-002", Diameter: 300, Pressure: 20, FlowRate: 180, Material: "Steel" },
    ],
  },
  {
    id: "qc-general",
    name: { ar: "ضبط الجودة العام", en: "General Quality Control" },
    description: {
      ar: "قياسات ضبط الجودة مع التفاوت المسموح",
      en: "QC measurements with tolerance",
    },
    category: "general",
    icon: Settings,
    columns: [
      { name: "Sample", type: "text" },
      { name: "Measurement", type: "number", unit: "mm" },
      { name: "Target", type: "number", unit: "mm" },
      { name: "Tolerance", type: "number", unit: "mm" },
      { name: "Status", type: "text" },
    ],
    sampleRows: [
      { Sample: "S001", Measurement: 10.05, Target: 10.0, Tolerance: 0.1, Status: "OK" },
      { Sample: "S002", Measurement: 10.15, Target: 10.0, Tolerance: 0.1, Status: "OUT" },
    ],
  },
];

export default function TemplatesPage() {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [creating, setCreating] = useState<string | null>(null);

  const downloadCSV = (tpl: Template) => {
    const header = tpl.columns.map((c) => c.name).join(",");
    const rows = tpl.sampleRows.map((r) =>
      tpl.columns.map((c) => r[c.name] ?? "").join(",")
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

  const createDataset = async (tpl: Template) => {
    setCreating(tpl.id);
    try {
      // إنشاء CSV من القالب
      const header = tpl.columns.map((c) => c.name).join(",");
      const rows = tpl.sampleRows.map((r) =>
        tpl.columns.map((c) => r[c.name] ?? "").join(",")
      );
      const csv = [header, ...rows].join("\n");
      const file = new File([csv], `${tpl.id}.csv`, { type: "text/csv" });

      const form = new FormData();
      form.append("file", file);
      form.append("name", isAr ? tpl.name.ar : tpl.name.en);

      const res = await fetch("/api/datasets", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        toast({ title: isAr ? "تم إنشاء الملف" : "Dataset created" });
        navigate(`/datasets/${data.id}`);
      } else {
        toast({
          title: isAr ? "فشل الإنشاء" : "Creation failed",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: isAr ? "خطأ في الشبكة" : "Network error",
        variant: "destructive",
      });
    }
    setCreating(null);
  };

  const categoryLabel = (cat: string) => {
    if (cat === "garment") return isAr ? "ملابس" : "Garment";
    if (cat === "cad") return "CAD";
    if (cat === "industrial") return isAr ? "صناعي" : "Industrial";
    return isAr ? "عام" : "General";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          {isAr ? "قوالب جاهزة" : "Templates"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAr
            ? "ابدأ بسرعة بقالب قياسات جاهز (CAD، ملابس، بتروكيماويات، ضبط جودة)"
            : "Quick-start with a ready measurement template"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <Card key={tpl.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary">{categoryLabel(tpl.category)}</Badge>
                </div>
                <CardTitle className="text-base mt-2">{isAr ? tpl.name.ar : tpl.name.en}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground flex-1">
                  {isAr ? tpl.description.ar : tpl.description.en}
                </p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">{isAr ? "الأعمدة:" : "Columns:"} </span>
                  {tpl.columns.map((c) => c.name).join(", ")}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => createDataset(tpl)}
                    disabled={creating === tpl.id}
                    className="flex-1"
                  >
                    {creating === tpl.id
                      ? isAr
                        ? "جارٍ..."
                        : "Creating..."
                      : isAr
                      ? "إنشاء ملف"
                      : "Create"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadCSV(tpl)} className="gap-1">
                    <Download className="w-3 h-3" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
