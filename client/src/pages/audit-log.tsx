import { useContext, useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, ShieldAlert, Search, RefreshCw } from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { useAuth } from "@/components/auth-gate";

interface AuditEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  ip: string | null;
  created_at: number;
}

const ACTION_COLORS: Record<string, string> = {
  login: "bg-green-500/15 text-green-700 dark:text-green-400",
  login_failed: "bg-red-500/15 text-red-700 dark:text-red-400",
  logout: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
  password_changed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  user_created: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  user_deleted: "bg-red-500/15 text-red-700 dark:text-red-400",
  dataset_uploaded: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  dataset_deleted: "bg-red-500/15 text-red-700 dark:text-red-400",
  share_granted: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

const AR_ACTIONS: Record<string, string> = {
  login: "تسجيل دخول",
  login_failed: "محاولة دخول فاشلة",
  logout: "تسجيل خروج",
  password_changed: "تغيير كلمة المرور",
  user_created: "إنشاء مستخدم",
  user_deleted: "حذف مستخدم",
  dataset_uploaded: "رفع ملف",
  dataset_deleted: "حذف ملف",
  share_granted: "منح صلاحية",
};

function fmt(ts: number, isAr: boolean) {
  try {
    return new Date(ts).toLocaleString(isAr ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AuditLogPage() {
  const { user } = useAuth();
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/audit-log?limit=500");
      if (r.ok) {
        const d = await r.json();
        setEntries(d.entries || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (user && user.role !== "admin") {
    return (
      <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{isAr ? "غير مصرح" : "Forbidden"}</h2>
            <p className="text-muted-foreground">
              {isAr ? "هذه الصفحة متاحة للمسؤولين فقط" : "Admin access required"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.username || "").toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      (e.ip || "").includes(q) ||
      (e.target_id || "").includes(q)
    );
  });

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{isAr ? "سجل العمليات" : "Audit Log"}</h1>
          </div>
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
            {isAr ? "تحديث" : "Refresh"}
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">
                {isAr ? `العمليات (${filtered.length})` : `Events (${filtered.length})`}
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isAr ? "بحث في السجل..." : "Search log..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="text-start p-3">{isAr ? "الوقت" : "Time"}</th>
                    <th className="text-start p-3">{isAr ? "المستخدم" : "User"}</th>
                    <th className="text-start p-3">{isAr ? "العملية" : "Action"}</th>
                    <th className="text-start p-3">{isAr ? "الهدف" : "Target"}</th>
                    <th className="text-start p-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {loading ? (isAr ? "جارٍ التحميل..." : "Loading...") : (isAr ? "لا توجد عمليات" : "No events")}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((e) => (
                      <tr key={e.id} className="border-t hover:bg-accent/30">
                        <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{fmt(e.created_at, isAr)}</td>
                        <td className="p-3 font-medium">{e.username || "—"}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={ACTION_COLORS[e.action] || "bg-muted"}>
                            {isAr ? (AR_ACTIONS[e.action] || e.action) : e.action}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs">
                          {e.target_type ? `${e.target_type}${e.target_id ? `: ${e.target_id}` : ""}` : "—"}
                        </td>
                        <td className="p-3 text-xs font-mono text-muted-foreground">{e.ip || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
