import { useContext, useEffect, useState, lazy, Suspense } from "react";
import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Languages, Ruler, Loader2 } from "lucide-react";
import { LangContext, translations, type Lang } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import UploadPage from "@/pages/upload";
import DatasetsWorkspace from "@/components/datasets-workspace";
import TabsBar from "@/components/tabs-bar";
import { OpenTabsProvider } from "@/lib/open-tabs";
import { AuthGate, LogoutButton, useAuth } from "@/components/auth-gate";
import { Users, ScrollText, Database, UsersRound, FileText, GitCompare, BarChart3 } from "lucide-react";
import { UpdateBadge } from "@/components/update-badge";
import { NotificationsBell } from "@/components/notifications-bell";

// Code-splitting للصفحات الثقيلة
const AnalysisViewPage = lazy(() => import("@/pages/analysis-view"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AuditLogPage = lazy(() => import("@/pages/audit-log"));
const AdminGroupsPage = lazy(() => import("@/pages/admin-groups"));
const AdminBackupPage = lazy(() => import("@/pages/admin-backup"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const TemplatesPage = lazy(() => import("@/pages/templates"));
const CompareDatasetsPage = lazy(() => import("@/pages/compare-datasets"));
const MultiAnalysisPage = lazy(() => import("@/pages/multi-analysis"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// روابط Admin: المستخدمين + المجموعات + النسخ + سجل العمليات
function AuditNavLink() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  if (!user || user.role !== "admin") return null;
  return (
    <Link
      href="/admin/audit"
      className={`px-2 py-1.5 rounded-md text-sm hover-elevate whitespace-nowrap flex items-center gap-1 ${
        location === "/admin/audit" ? "bg-accent text-accent-foreground" : ""
      }`}
    >
      <ScrollText className="w-4 h-4" />
      {isAr ? "سجل العمليات" : "Audit"}
    </Link>
  );
}

function AdminNavLink() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useContext(LangContext);
  if (!user || user.role !== "admin") return null;
  return (
    <Link
      href="/admin/users"
      className={`px-2 py-1.5 rounded-md text-sm hover-elevate whitespace-nowrap flex items-center gap-1 ${
        location === "/admin/users" ? "bg-accent text-accent-foreground" : ""
      }`}
      data-testid="link-admin-users"
    >
      <Users className="w-4 h-4" />
      {t.nav.adminUsers}
    </Link>
  );
}

function GroupsNavLink() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  if (!user || user.role !== "admin") return null;
  return (
    <Link
      href="/admin/groups"
      className={`px-2 py-1.5 rounded-md text-sm hover-elevate whitespace-nowrap flex items-center gap-1 ${
        location === "/admin/groups" ? "bg-accent text-accent-foreground" : ""
      }`}
    >
      <UsersRound className="w-4 h-4" />
      {isAr ? "المجموعات" : "Groups"}
    </Link>
  );
}

function BackupNavLink() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  if (!user || user.role !== "admin") return null;
  return (
    <Link
      href="/admin/backup"
      className={`px-2 py-1.5 rounded-md text-sm hover-elevate whitespace-nowrap flex items-center gap-1 ${
        location === "/admin/backup" ? "bg-accent text-accent-foreground" : ""
      }`}
    >
      <Database className="w-4 h-4" />
      {isAr ? "النسخ" : "Backup"}
    </Link>
  );
}

function Header() {
  const [location] = useLocation();
  const { lang, setLang, t } = useContext(LangContext);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("qiyasat-theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { window.localStorage.setItem("qiyasat-theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <header className="border-b border-border bg-sidebar sticky top-0 z-50">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/"
          className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1"
          data-testid="link-home"
        >
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Ruler className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base">{t.appName}</div>
            <div className="text-xs text-muted-foreground hidden sm:block">{t.appTagline}</div>
          </div>
        </Link>
        <nav className="flex items-center gap-0.5 flex-wrap order-3 w-full lg:w-auto lg:order-2 overflow-x-auto">
          <Link
            href="/"
            className={`px-2 py-1.5 rounded-md text-sm hover-elevate whitespace-nowrap ${
              location === "/" ? "bg-accent text-accent-foreground" : ""
            }`}
            data-testid="link-datasets"
          >
            {t.nav.datasets}
          </Link>
          <Link
            href="/upload"
            className={`px-2 py-1.5 rounded-md text-sm hover-elevate whitespace-nowrap ${
              location === "/upload" ? "bg-accent text-accent-foreground" : ""
            }`}
            data-testid="link-upload"
          >
            {t.nav.upload}
          </Link>
          <Link
            href="/templates"
            className={`px-2 py-1.5 rounded-md text-sm hover-elevate whitespace-nowrap flex items-center gap-1 ${
              location === "/templates" ? "bg-accent text-accent-foreground" : ""
            }`}
          >
            <FileText className="w-4 h-4" />
            {lang === "ar" ? "قوالب" : "Templates"}
          </Link>
          <Link
            href="/compare"
            className={`px-2 py-1.5 rounded-md text-sm hover-elevate whitespace-nowrap flex items-center gap-1 ${
              location === "/compare" ? "bg-accent text-accent-foreground" : ""
            }`}
          >
            <GitCompare className="w-4 h-4" />
            {lang === "ar" ? "مقارنة" : "Compare"}
          </Link>
          <Link
            href="/multi-analysis"
            className={`px-2 py-1.5 rounded-md text-sm hover-elevate whitespace-nowrap flex items-center gap-1 ${
              location === "/multi-analysis" ? "bg-accent text-accent-foreground" : ""
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {lang === "ar" ? "تحليل متعدد" : "Multi-Analysis"}
          </Link>
          <AdminNavLink />
          <GroupsNavLink />
          <BackupNavLink />
          <AuditNavLink />
        </nav>
        <div className="flex items-center gap-1 order-2 lg:order-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            data-testid="button-lang"
          >
            <Languages className="w-4 h-4 me-1" />
            {t.common.language}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark((d) => !d)}
            data-testid="button-theme"
            aria-label={t.common.theme}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <UpdateBadge />
          <NotificationsBell />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

function AppRouter() {
  const [location] = useLocation();
  // صفحة عرض التحليل المستقلة — تخطيط مستقل بدون Header العام
  if (location.startsWith("/analysis-view")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AnalysisViewPage />
      </Suspense>
    );
  }
  // وضع embed للتضمين في iframe — بدون Header/TabsBar
  // مع hash routing، الـ query تأتي داخل الـ hash (مثل #/datasets/12?embed=1)
  const isEmbed = (() => {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash || "";
    const qIdx = hash.indexOf("?");
    const qs = qIdx !== -1 ? hash.slice(qIdx + 1) : window.location.search.replace(/^\?/, "");
    return new URLSearchParams(qs).get("embed") === "1";
  })();
  if (isEmbed) {
    return (
      <div className="min-h-screen bg-background text-foreground embed-mode">
        <main className="px-2 py-2">
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/datasets/:id" component={DatasetsWorkspace} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <TabsBar />
      <main className="w-full px-3 sm:px-4 lg:px-6 py-4">
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/upload" component={UploadPage} />
            <Route path="/datasets/:id" component={DatasetsWorkspace} />
            <Route path="/admin/users" component={AdminUsersPage} />
            <Route path="/admin/audit" component={AuditLogPage} />
            <Route path="/admin/groups" component={AdminGroupsPage} />
            <Route path="/admin/backup" component={AdminBackupPage} />
            <Route path="/templates" component={TemplatesPage} />
            <Route path="/compare" component={CompareDatasetsPage} />
            <Route path="/multi-analysis" component={MultiAnalysisPage} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}

// AuthGate wrapper مع مسار نسيت كلمة المرور (مستقل عن المصادقة)
function AppWithRouter() {
  const [location] = useLocation();
  if (location === "/forgot-password") {
    return (
      <Suspense fallback={<PageLoader />}>
        <ForgotPasswordPage />
      </Suspense>
    );
  }
  return (
    <AuthGate>
      <OpenTabsProvider>
        <AppRouter />
      </OpenTabsProvider>
    </AuthGate>
  );
}

function App() {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ar";
    const saved = window.localStorage.getItem("qiyasat-lang");
    return saved === "en" || saved === "ar" ? (saved as Lang) : "ar";
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem("qiyasat-lang", l); } catch {}
  };
  const value = { lang, setLang, t: translations[lang] };
  return (
    <QueryClientProvider client={queryClient}>
      <LangContext.Provider value={value}>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppWithRouter />
          </Router>
        </TooltipProvider>
      </LangContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
