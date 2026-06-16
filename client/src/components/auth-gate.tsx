import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler, Lock, User as UserIcon, LogOut, AlertCircle } from "lucide-react";
import { LangContext } from "@/lib/i18n";

interface User {
  id: number;
  username: string;
  role: string;
  mustChangePassword?: boolean;
  lastLogin?: number | null;
}

interface AuthContextValue {
  user: User | null;
  authEnabled: boolean;
  logout: () => Promise<void>;
}

interface AuthContextValueFull extends AuthContextValue {
  refreshUser?: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValueFull>({
  user: null,
  authEnabled: false,
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const TOKEN_KEY = "qiyasat_auth_token";

// تجاوز فحص localStorage في sandbox
function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}
function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}
function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

// إضافة Authorization header لكل طلبات fetch
export function installAuthFetch() {
  if ((window as any).__qiyasatFetchPatched) return;
  (window as any).__qiyasatFetchPatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getToken();
    if (token) {
      const headers = new Headers(init?.headers || {});
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return orig(input, { ...init, headers });
    }
    return orig(input, init);
  };
}

interface LoginFormProps {
  onSuccess: (user: User) => void;
}

function LoginForm({ onSuccess }: LoginFormProps) {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (isAr ? "فشل تسجيل الدخول" : "Login failed"));
        setLoading(false);
        return;
      }
      setToken(data.token);
      onSuccess(data.user);
    } catch (err) {
      setError(isAr ? "تعذّر الاتصال بالخادم" : "Cannot connect to server");
      setLoading(false);
    }
  };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6"
    >
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-3 shadow-lg">
              <Ruler className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-bold">{isAr ? "قياسات" : "Qiyasat"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr
                ? "نظام إدارة وتحليل ملفات القياسات الضخمة"
                : "Measurement Files Management & Analysis"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                {isAr ? "اسم المستخدم" : "Username"}
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isAr ? "admin" : "admin"}
                required
                autoFocus
                autoComplete="username"
                className="h-11"
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {isAr ? "كلمة المرور" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-11"
                data-testid="input-password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-semibold"
              data-testid="button-login"
            >
              {loading
                ? isAr
                  ? "جارٍ التحقق..."
                  : "Verifying..."
                : isAr
                ? "دخول"
                : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {isAr
              ? "البيانات محفوظة محلياً على جهازك"
              : "Data stored locally on your device"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "no-auth" | "needs-login" | "authed">(
    "loading"
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    installAuthFetch();
    (async () => {
      try {
        const r = await fetch("/api/auth/status");
        const s = await r.json();
        if (!s.enabled) {
          setStatus("no-auth");
          return;
        }
        // المصادقة مفعّلة — تحقّق من Token
        const token = getToken();
        if (!token) {
          setStatus("needs-login");
          return;
        }
        const me = await fetch("/api/auth/me");
        if (me.ok) {
          const data = await me.json();
          setUser(data.user);
          setStatus("authed");
        } else {
          clearToken();
          setStatus("needs-login");
        }
      } catch {
        // إذا فشل الفحص، تابع بدون مصادقة (للتطوير)
        setStatus("no-auth");
      }
    })();
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    clearToken();
    setUser(null);
    setStatus("needs-login");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">...</div>
      </div>
    );
  }

  if (status === "needs-login") {
    return (
      <LoginForm
        onSuccess={(u) => {
          setUser(u);
          setStatus("authed");
        }}
      />
    );
  }

  const refreshUser = async () => {
    try {
      const me = await fetch("/api/auth/me");
      if (me.ok) {
        const data = await me.json();
        setUser(data.user);
      }
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, authEnabled: status === "authed", logout, refreshUser }}>
      {user?.mustChangePassword && <ForceChangePasswordDialog onSuccess={refreshUser} />}
      {children}
    </AuthContext.Provider>
  );
}

// ═══ دايلوغ إجباري لتغيير كلمة المرور ═══
function ForceChangePasswordDialog({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      setError(isAr ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل");
        setLoading(false);
        return;
      }
      await onSuccess();
    } catch {
      setError(isAr ? "تعذّر الاتصال" : "Network error");
      setLoading(false);
    }
  };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-md shadow-2xl border-2 border-amber-500/40">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-center">
              {isAr ? "يجب تغيير كلمة المرور" : "You must change your password"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {isAr
                ? "لأسباب أمنية، يجب تغيير كلمة المرور الافتراضية قبل المتابعة."
                : "For security, please change the default password before continuing."}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? "كلمة المرور الحالية" : "Current password"}</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoFocus className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "كلمة المرور الجديدة" : "New password"}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "تأكيد كلمة المرور" : "Confirm password"}</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="h-11" />
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
              {loading ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ ومتابعة" : "Save & continue")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// زر تسجيل خروج للترويسة
export function LogoutButton() {
  const { user, authEnabled, logout } = useAuth();
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  if (!authEnabled || !user) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground hidden md:inline">
        {user.username}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={logout}
        title={isAr ? "تسجيل خروج" : "Logout"}
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
}
