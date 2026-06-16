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
import { Users, ScrollText, Database, UsersRound, FileText, GitCompare } from "lucide-react";
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
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const prefers = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setDark(!!prefers);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <header className="border-b border-border bg-sidebar sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
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
  const isEmbed =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("embed") === "1";
  if (isEmbed) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="px-3 py-3">
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
      <main className="max-w-7xl mx-auto px-6 py-8">
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
  const [lang, setLang] = useState<Lang>("ar");
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
