import { useState, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { useAuth } from "@/components/auth-gate";

export default function AdminBackupPage() {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  if (!user || user.role !== "admin") {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {isAr ? "هذه الصفحة متاحة للمشرفين فقط" : "Admin only"}
        </CardContent>
      </Card>
    );
  }

  const download = async () => {
    setDownloading(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        setStatus("err");
        setDownloading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `qiyasat-backup-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("ok");
    } catch {
      setStatus("err");
    }
    setDownloading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6" />
          {isAr ? "النسخ الاحتياطي" : "Backup"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAr
            ? "تصدير نسخة كاملة من قاعدة البيانات (JSON)"
            : "Export full database snapshot (JSON)"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "تنزيل النسخة" : "Download Backup"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "يحتوي الملف على: المستخدمين، الفرق، الإشعارات، التعليقات، سجل العمليات، الصلاحيات، أسئلة الأمان، وجميع البيانات الإدارية. (datasets المرفوعة موجودة في data/datasets)."
              : "Includes: users, teams, notifications, comments, audit log, permissions, security questions, and all admin data. (Uploaded datasets are in data/datasets)."}
          </p>

          <Button onClick={download} disabled={downloading} className="gap-2">
            <Download className="w-4 h-4" />
            {downloading
              ? isAr
                ? "جارٍ التنزيل..."
                : "Downloading..."
              : isAr
              ? "تنزيل النسخة الاحتياطية"
              : "Download Backup"}
          </Button>

          {status === "ok" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-800 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
              <span>{isAr ? "تم التنزيل بنجاح" : "Downloaded successfully"}</span>
            </div>
          )}

          {status === "err" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{isAr ? "فشل التنزيل" : "Download failed"}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "ملاحظات هامة" : "Important Notes"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>{isAr ? "• احفظ النسخة في مكان آمن (Google Drive/USB)" : "• Store backup in safe location"}</p>
          <p>{isAr ? "• كلمات المرور مشفّرة (bcrypt) — لا تظهر بشكل صريح" : "• Passwords are hashed (bcrypt)"}</p>
          <p>{isAr ? "• استعادة البيانات تتطلب تدخّل مطور" : "• Restoration requires developer assistance"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
