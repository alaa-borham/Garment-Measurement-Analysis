import { c as createLucideIcon, g as useAuth, r as reactExports, L as LangContext, j as jsxRuntimeExports, C as Card, a as CardContent, O as Link, B as Button, P as ArrowRight, Q as ArrowLeft, k as CardHeader, l as CardTitle, V as Search, I as Input, m as Badge } from "./index-klzEDF9_.js";
import { S as ShieldAlert } from "./shield-alert-C3BiYQFb.js";
const RefreshCw = createLucideIcon("RefreshCw", [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
]);
const ACTION_COLORS = {
  login: "bg-green-500/15 text-green-700 dark:text-green-400",
  login_failed: "bg-red-500/15 text-red-700 dark:text-red-400",
  logout: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
  password_changed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  user_created: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  user_deleted: "bg-red-500/15 text-red-700 dark:text-red-400",
  dataset_uploaded: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  dataset_deleted: "bg-red-500/15 text-red-700 dark:text-red-400",
  share_granted: "bg-amber-500/15 text-amber-700 dark:text-amber-400"
};
const AR_ACTIONS = {
  login: "تسجيل دخول",
  login_failed: "محاولة دخول فاشلة",
  logout: "تسجيل خروج",
  password_changed: "تغيير كلمة المرور",
  user_created: "إنشاء مستخدم",
  user_deleted: "حذف مستخدم",
  dataset_uploaded: "رفع ملف",
  dataset_deleted: "حذف ملف",
  share_granted: "منح صلاحية"
};
function fmt(ts, isAr) {
  if (!ts) return "—";
  try {
    const n = Number(ts);
    if (!isFinite(n) || n <= 0) return String(ts);
    const ms = n < 1e12 ? n * 1e3 : n;
    return new Date(ms).toLocaleString(isAr ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return String(ts);
  }
}
function AuditLogPage() {
  const auth = useAuth();
  const user = auth?.user;
  const { lang } = reactExports.useContext(LangContext);
  const isAr = lang === "ar";
  const [entries, setEntries] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [search, setSearch] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/audit-log?limit=500");
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        setError(`HTTP ${r.status}: ${txt || r.statusText}`);
        setEntries([]);
      } else {
        const d = await r.json();
        setEntries(Array.isArray(d?.entries) ? d.entries : []);
      }
    } catch (e) {
      setError(e?.message || "network error");
      setEntries([]);
    }
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  if (user && user.role !== "admin") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { dir: isAr ? "rtl" : "ltr", className: "p-6 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "max-w-md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-8 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "w-12 h-12 text-destructive mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold mb-2", children: isAr ? "غير مصرح" : "Forbidden" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: isAr ? "هذه الصفحة متاحة للمسؤولين فقط" : "Admin access required" })
    ] }) }) });
  }
  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (e.username || "").toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || (e.ip || "").includes(q) || (e.target_id || "").includes(q);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { dir: isAr ? "rtl" : "ltr", className: "", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-6xl mx-auto space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { href: "/", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", children: isAr ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "w-4 h-4" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: isAr ? "سجل العمليات" : "Audit Log" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: load, variant: "outline", size: "sm", disabled: loading, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-4 h-4 me-2 ${loading ? "animate-spin" : ""}` }),
        isAr ? "تحديث" : "Refresh"
      ] })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-destructive/50 bg-destructive/5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3 text-sm text-destructive", children: [
      isAr ? "خطأ: " : "Error: ",
      error
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: isAr ? `العمليات (${filtered.length})` : `Events (${filtered.length})` }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full sm:w-72", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              placeholder: isAr ? "بحث في السجل..." : "Search log...",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              className: "ps-9"
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 text-xs uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-start p-3", children: isAr ? "الوقت" : "Time" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-start p-3", children: isAr ? "المستخدم" : "User" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-start p-3", children: isAr ? "العملية" : "Action" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-start p-3", children: isAr ? "الهدف" : "Target" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-start p-3", children: "IP" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, className: "p-8 text-center text-muted-foreground", children: loading ? isAr ? "جارٍ التحميل..." : "Loading..." : isAr ? "لا توجد عمليات" : "No events" }) }) : filtered.map((e) => {
          const action = String(e?.action || "");
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t hover:bg-accent/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 whitespace-nowrap text-xs text-muted-foreground", children: fmt(e?.created_at, isAr) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 font-medium", children: e?.username || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: ACTION_COLORS[action] || "bg-muted", children: isAr ? AR_ACTIONS[action] || action : action }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-xs", children: e?.target_type ? `${e.target_type}${e.target_id ? `: ${e.target_id}` : ""}` : "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-xs font-mono text-muted-foreground", children: e?.ip || "—" })
          ] }, e?.id ?? Math.random());
        }) })
      ] }) }) })
    ] })
  ] }) });
}
export {
  AuditLogPage as default
};
//# sourceMappingURL=audit-log-BrUpgSUO.js.map
