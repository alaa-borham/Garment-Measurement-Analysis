import { useState, useContext } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler, AlertCircle, CheckCircle2 } from "lucide-react";
import { LangContext } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"lookup" | "answer" | "done">("lookup");
  const [username, setUsername] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (isAr ? "لم يتم العثور على سؤال أمان" : "No security question set"));
      } else {
        setQuestion(data.question);
        setStep("answer");
      }
    } catch {
      setError(isAr ? "تعذّر الاتصال" : "Connection failed");
    }
    setLoading(false);
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError(isAr ? "كلمة المرور على الأقل 6 أحرف" : "Password min 6 chars");
      return;
    }
    if (newPassword !== confirm) {
      setError(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, answer, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (isAr ? "إجابة خاطئة" : "Wrong answer"));
      } else {
        setStep("done");
      }
    } catch {
      setError(isAr ? "تعذّر الاتصال" : "Connection failed");
    }
    setLoading(false);
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
            <h1 className="text-2xl font-bold">{isAr ? "استعادة كلمة المرور" : "Reset Password"}</h1>
          </div>

          {step === "lookup" && (
            <form onSubmit={lookup} className="space-y-4">
              <div className="space-y-2">
                <Label>{isAr ? "اسم المستخدم" : "Username"}</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="h-11"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? (isAr ? "جارٍ..." : "Loading...") : isAr ? "التالي" : "Next"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/")}
              >
                {isAr ? "العودة لتسجيل الدخول" : "Back to login"}
              </Button>
            </form>
          )}

          {step === "answer" && (
            <form onSubmit={reset} className="space-y-4">
              <div className="p-3 rounded-md bg-muted text-sm">
                <div className="font-semibold mb-1">{isAr ? "سؤال الأمان:" : "Security Question:"}</div>
                <div>{question}</div>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الإجابة" : "Answer"}</Label>
                <Input value={answer} onChange={(e) => setAnswer(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "كلمة المرور الجديدة" : "New Password"}</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "تأكيد كلمة المرور" : "Confirm Password"}</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? (isAr ? "جارٍ..." : "Loading...") : isAr ? "إعادة التعيين" : "Reset"}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <p className="text-lg font-semibold">
                {isAr ? "تم إعادة تعيين كلمة المرور" : "Password Reset Successful"}
              </p>
              <Button onClick={() => navigate("/")} className="w-full h-11">
                {isAr ? "تسجيل الدخول" : "Sign in"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
