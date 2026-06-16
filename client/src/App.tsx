import { useContext, useEffect, useState } from "react";
import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Languages, Ruler } from "lucide-react";
// Users icon تم إضافتها أعلاه في import lucide-react الرئيسي
import { LangContext, translations, type Lang } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import UploadPage from "@/pages/upload";
import AnalysisViewPage from "@/pages/analysis-view";
import AdminUsersPage from "@/pages/admin-users";
import AuditLogPage from "@/pages/audit-log";
import DatasetsWorkspace from "@/components/datasets-workspace";
import TabsBar from "@/components/tabs-bar";
import { OpenTabsProvider } from "@/lib/open-tabs";
import { AuthGate, LogoutButton, useAuth } from "@/components/auth-gate";
import { Users, ScrollText } from "lucide-react";
import { UpdateBadge } from "@/components/update-badge";
import { NotificationsBell } from "@/components/notifications-bell";

// رابط سجل العمليات - لـ admin فقط
function AuditNavLink() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  if (!user || user.role !== "admin") return null;
  return (
    <Link
      href="/admin/audit"
      className={`px-3 py-2 rounded-md text-sm hover-elevate flex items-center gap-1 ${
        location === "/admin/audit" ? "bg-accent text-accent-foreground" : ""
      }`}
    >
      <ScrollText className="w-4 h-4" />
      {isAr ? "سجل العمليات" : "Audit"}
    </Link>
  );
}

// رابط إدارة المستخدمين - يظهر لـ admin فقط
function AdminNavLink() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useContext(LangContext);
  if (!user || user.role !== "admin") return null;
  return (
    <Link
      href="/admin/users"
      className={`px-3 py-2 rounded-md text-sm hover-elevate flex items-center gap-1 ${
        location === "/admin/users" ? "bg-accent text-accent-foreground" : ""
      }`}
      data-testid="link-admin-users"
    >
      <Users className="w-4 h-4" />
      {t.nav.adminUsers}
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
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
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
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-2 rounded-md text-sm hover-elevate ${
              location === "/" ? "bg-accent text-accent-foreground" : ""
            }`}
            data-testid="link-datasets"
          >
            {t.nav.datasets}
          </Link>
          <Link
            href="/upload"
            className={`px-3 py-2 rounded-md text-sm hover-elevate ${
              location === "/upload" ? "bg-accent text-accent-foreground" : ""
            }`}
            data-testid="link-upload"
          >
            {t.nav.upload}
          </Link>
          <AdminNavLink />
          <AuditNavLink />
        </nav>
        <div className="flex items-center gap-2">
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
    return <AnalysisViewPage />;
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <TabsBar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/upload" component={UploadPage} />
          <Route path="/datasets/:id" component={DatasetsWorkspace} />
          <Route path="/admin/users" component={AdminUsersPage} />
          <Route path="/admin/audit" component={AuditLogPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
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
          <AuthGate>
            <Router hook={useHashLocation}>
              <OpenTabsProvider>
                <AppRouter />
              </OpenTabsProvider>
            </Router>
          </AuthGate>
        </TooltipProvider>
      </LangContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
