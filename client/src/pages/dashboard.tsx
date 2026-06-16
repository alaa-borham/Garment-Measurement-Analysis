import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Scissors,
  Shirt,
  Ruler,
  FileSpreadsheet,
  Upload,
  GitCompare,
  LayoutGrid,
  Users,
  TrendingUp,
  Sparkles,
  Tag,
  Package,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { LangContext } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/auth-gate";

interface DashboardStats {
  totalDatasets: number;
  totalRows: number;
  totalUploadsThisMonth: number;
  recentDatasets: Array<{
    id: number;
    name: string;
    file_name: string;
    row_count: number;
    created_at: string;
  }>;
  uploadsTimeline: Array<{ period: string; count: number; rows: number }>;
  topByRows: Array<{ id: number; name: string; row_count: number }>;
  adminStats?: { totalUsers: number } | null;
}

export default function DashboardPage() {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const can = (feat: string) => {
    if (!user) return true;
    if (user.role === "admin") return true;
    return user.permissions?.[feat] !== false;
  };

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/dashboard/stats");
      return r.json();
    },
  });

  const L = {
    title: isAr ? "لوحة التحكم" : "Dashboard",
    welcome: isAr ? "مرحباً بك في قياسات" : "Welcome to Qiyasat",
    subtitle: isAr
      ? "إدارة قياسات الملابس والقطع التفصيلية"
      : "Manage garment measurements & patterns",
    totalDatasets: isAr ? "إجمالي الملفات" : "Total files",
    totalRows: isAr ? "إجمالي القياسات" : "Total measurements",
    uploadsThisMonth: isAr ? "رفوعات هذا الشهر" : "Uploads this month",
    totalUsers: isAr ? "المستخدمون" : "Users",
    quickActions: isAr ? "إجراءات سريعة" : "Quick actions",
    upload: isAr ? "رفع ملف جديد" : "Upload file",
    datasets: isAr ? "الملفات" : "Files",
    compare: isAr ? "مقارنة" : "Compare",
    templates: isAr ? "القوالب" : "Templates",
    multiAnalysis: isAr ? "تحليل متعدد" : "Multi-analysis",
    admin: isAr ? "إدارة المستخدمين" : "Manage users",
    recentFiles: isAr ? "آخر الملفات" : "Recent files",
    largestFiles: isAr ? "أكبر الملفات" : "Largest files",
    uploadsTrend: isAr ? "الرفوعات الأسبوعية (آخر 12 أسبوع)" : "Weekly uploads (last 12 weeks)",
    rows: isAr ? "صف" : "rows",
    noData: isAr ? "لا توجد بيانات بعد" : "No data yet",
    open: isAr ? "فتح" : "Open",
    viewAll: isAr ? "عرض الكل" : "View all",
  };

  const ArrowFwd = isAr ? ArrowLeft : ArrowRight;

  const formatNumber = (n: number) => n.toLocaleString(isAr ? "ar-EG" : "en-US");
  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return s;
    }
  };

  // KPI cards config
  const kpis: Array<{
    label: string;
    value: string;
    icon: any;
    bg: string;
    fg: string;
    show: boolean;
  }> = [
    {
      label: L.totalDatasets,
      value: formatNumber(data?.totalDatasets ?? 0),
      icon: Shirt,
      bg: "bg-[hsl(173,55%,92%)] dark:bg-[hsl(173,40%,18%)]",
      fg: "text-[hsl(173,75%,28%)] dark:text-[hsl(173,55%,70%)]",
      show: true,
    },
    {
      label: L.totalRows,
      value: formatNumber(data?.totalRows ?? 0),
      icon: Ruler,
      bg: "bg-[hsl(35,75%,92%)] dark:bg-[hsl(35,40%,18%)]",
      fg: "text-[hsl(28,75%,42%)] dark:text-[hsl(35,75%,70%)]",
      show: true,
    },
    {
      label: L.uploadsThisMonth,
      value: formatNumber(data?.totalUploadsThisMonth ?? 0),
      icon: Scissors,
      bg: "bg-[hsl(340,60%,94%)] dark:bg-[hsl(340,30%,20%)]",
      fg: "text-[hsl(340,65%,45%)] dark:text-[hsl(340,55%,72%)]",
      show: true,
    },
    {
      label: L.totalUsers,
      value: formatNumber(data?.adminStats?.totalUsers ?? 0),
      icon: Users,
      bg: "bg-[hsl(260,50%,94%)] dark:bg-[hsl(260,30%,22%)]",
      fg: "text-[hsl(260,55%,45%)] dark:text-[hsl(260,55%,72%)]",
      show: isAdmin && data?.adminStats != null,
    },
  ];

  const quickActions = [
    { label: L.upload, href: "/upload", icon: Upload, feat: "upload" },
    { label: L.datasets, href: "/datasets", icon: FileSpreadsheet, feat: null },
    { label: L.compare, href: "/compare", icon: GitCompare, feat: "compare_files" },
    { label: L.templates, href: "/templates", icon: Tag, feat: "templates" },
    { label: L.multiAnalysis, href: "/multi-analysis", icon: LayoutGrid, feat: "multi_analysis" },
    ...(isAdmin
      ? [{ label: L.admin, href: "/admin/users", icon: Users, feat: null }]
      : []),
  ].filter((a) => !a.feat || can(a.feat));

  // Build chart data with friendly week labels
  const chartData = (data?.uploadsTimeline ?? []).map((p, i) => ({
    period: p.period,
    label: `W${i + 1}`,
    count: p.count,
    rows: p.rows,
  }));

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <Card className="overflow-hidden border-2 border-primary/15 relative">
        <CardContent className="p-6 md:p-8 relative">
          {/* Decorative SVG pattern (sewing thread waves) */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none text-primary"
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,50 Q25,20 50,50 T100,50 T150,50 T200,50"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <path
              d="M0,70 Q25,40 50,70 T100,70 T150,70 T200,70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <path
              d="M0,30 Q25,0 50,30 T100,30 T150,30 T200,30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          </svg>
          <div className="flex items-start justify-between gap-4 flex-wrap relative">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
                <Shirt className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                  {L.welcome}
                  <Sparkles className="w-5 h-5 text-[hsl(35,85%,55%)]" />
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-0.5">
                  {L.subtitle}
                </p>
              </div>
            </div>
            {can("upload") && (
              <Link href="/upload">
                <Button size="lg" className="gap-2" data-testid="dashboard-cta-upload">
                  <Upload className="w-4 h-4" />
                  {L.upload}
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis
          .filter((k) => k.show)
          .map((k, i) => {
            const Icon = k.icon;
            return (
              <Card
                key={i}
                className="relative overflow-hidden hover-elevate transition-all"
                data-testid={`kpi-${i}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {k.label}
                      </div>
                      <div className="text-2xl md:text-3xl font-bold mt-1.5 tabular-nums">
                        {isLoading ? "—" : k.value}
                      </div>
                    </div>
                    <div
                      className={`w-11 h-11 rounded-xl ${k.bg} ${k.fg} flex items-center justify-center shrink-0`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          {L.quickActions}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((a, i) => {
            const Icon = a.icon;
            return (
              <Link key={i} href={a.href} data-testid={`quick-${a.href.replace("/", "")}`}>
                <Card className="hover-elevate cursor-pointer h-full transition-all border-2 hover:border-primary/40">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[100px]">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-medium">{a.label}</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Charts + lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Uploads trend chart */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {L.uploadsTrend}
              </h3>
            </div>
            {chartData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                {L.noData}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(173, 75%, 40%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(173, 75%, 40%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [v, isAr ? "ملفات مرفوعة" : "Uploads"]}
                    labelFormatter={(_, p) => p?.[0]?.payload?.period ?? ""}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(173, 75%, 35%)"
                    strokeWidth={2}
                    fill="url(#gradTeal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent files */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                {L.recentFiles}
              </h3>
              <Link href="/datasets">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  {L.viewAll}
                  <ArrowFwd className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {(data?.recentDatasets?.length ?? 0) === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
                {L.noData}
              </div>
            ) : (
              <div className="space-y-2">
                {data!.recentDatasets.map((d) => (
                  <Link
                    key={d.id}
                    href={`/datasets/${d.id}`}
                    data-testid={`recent-${d.id}`}
                  >
                    <div className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer border">
                      <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" title={d.name}>
                          {d.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatNumber(d.row_count)} {L.rows} • {formatDate(d.created_at)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Largest files */}
      {(data?.topByRows?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Ruler className="w-4 h-4 text-primary" />
              {L.largestFiles}
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(160, (data?.topByRows?.length || 0) * 36)}>
              <BarChart
                data={data!.topByRows.map((t) => ({
                  name: t.name.length > 20 ? t.name.slice(0, 20) + "…" : t.name,
                  rows: t.row_count,
                  id: t.id,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [formatNumber(v), L.rows]}
                />
                <Bar dataKey="rows" fill="hsl(173, 75%, 38%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
