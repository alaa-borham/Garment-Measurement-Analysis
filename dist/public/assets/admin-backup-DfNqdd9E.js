import { r as reactExports, L as LangContext, g as useAuth, j as jsxRuntimeExports, C as Card, a as CardContent, Z as Database, k as CardHeader, l as CardTitle, B as Button, _ as Download, $ as CircleCheck, i as CircleAlert } from "./index-klzEDF9_.js";
function AdminBackupPage() {
  const { lang } = reactExports.useContext(LangContext);
  const isAr = lang === "ar";
  const { user } = useAuth();
  const [downloading, setDownloading] = reactExports.useState(false);
  const [status, setStatus] = reactExports.useState("idle");
  if (!user || user.role !== "admin") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-6 text-center text-muted-foreground", children: isAr ? "هذه الصفحة متاحة للمشرفين فقط" : "Admin only" }) });
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
      const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "w-6 h-6" }),
        isAr ? "النسخ الاحتياطي" : "Backup"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm mt-1", children: isAr ? "تصدير نسخة كاملة من قاعدة البيانات (JSON)" : "Export full database snapshot (JSON)" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: isAr ? "تنزيل النسخة" : "Download Backup" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: isAr ? "يحتوي الملف على: المستخدمين، الفرق، الإشعارات، التعليقات، سجل العمليات، الصلاحيات، أسئلة الأمان، وجميع البيانات الإدارية. (datasets المرفوعة موجودة في data/datasets)." : "Includes: users, teams, notifications, comments, audit log, permissions, security questions, and all admin data. (Uploaded datasets are in data/datasets)." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: download, disabled: downloading, className: "gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4" }),
          downloading ? isAr ? "جارٍ التنزيل..." : "Downloading..." : isAr ? "تنزيل النسخة الاحتياطية" : "Download Backup"
        ] }),
        status === "ok" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-800 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 mt-0.5 shrink-0 text-green-600" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isAr ? "تم التنزيل بنجاح" : "Downloaded successfully" })
        ] }),
        status === "err" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 mt-0.5 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isAr ? "فشل التنزيل" : "Download failed" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: isAr ? "ملاحظات هامة" : "Important Notes" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "text-sm space-y-2 text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: isAr ? "• احفظ النسخة في مكان آمن (Google Drive/USB)" : "• Store backup in safe location" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: isAr ? "• كلمات المرور مشفّرة (bcrypt) — لا تظهر بشكل صريح" : "• Passwords are hashed (bcrypt)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: isAr ? "• استعادة البيانات تتطلب تدخّل مطور" : "• Restoration requires developer assistance" })
      ] })
    ] })
  ] });
}
export {
  AdminBackupPage as default
};
//# sourceMappingURL=admin-backup-DfNqdd9E.js.map
