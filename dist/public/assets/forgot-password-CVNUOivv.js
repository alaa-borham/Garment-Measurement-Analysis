import { r as reactExports, L as LangContext, u as useLocation, j as jsxRuntimeExports, C as Card, a as CardContent, R as Ruler, w as Label, I as Input, i as CircleAlert, B as Button, $ as CircleCheck } from "./index-klzEDF9_.js";
function ForgotPasswordPage() {
  const { lang } = reactExports.useContext(LangContext);
  const isAr = lang === "ar";
  const [, navigate] = useLocation();
  const [step, setStep] = reactExports.useState("lookup");
  const [username, setUsername] = reactExports.useState("");
  const [question, setQuestion] = reactExports.useState("");
  const [answer, setAnswer] = reactExports.useState("");
  const [newPassword, setNewPassword] = reactExports.useState("");
  const [confirm, setConfirm] = reactExports.useState("");
  const [error, setError] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const lookup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
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
  const reset = async (e) => {
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
        body: JSON.stringify({ username, answer, newPassword })
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
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      dir: isAr ? "rtl" : "ltr",
      className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "w-full max-w-md shadow-2xl border-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center mb-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-3 shadow-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ruler, { className: "w-9 h-9" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: isAr ? "استعادة كلمة المرور" : "Reset Password" })
        ] }),
        step === "lookup" && /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: lookup, className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: isAr ? "اسم المستخدم" : "Username" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: username,
                onChange: (e) => setUsername(e.target.value),
                required: true,
                autoFocus: true,
                className: "h-11"
              }
            )
          ] }),
          error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 mt-0.5 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: error })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: loading, className: "w-full h-11", children: loading ? isAr ? "جارٍ..." : "Loading..." : isAr ? "التالي" : "Next" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              className: "w-full",
              onClick: () => navigate("/"),
              children: isAr ? "العودة لتسجيل الدخول" : "Back to login"
            }
          )
        ] }),
        step === "answer" && /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: reset, className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-md bg-muted text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold mb-1", children: isAr ? "سؤال الأمان:" : "Security Question:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: question })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: isAr ? "الإجابة" : "Answer" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: answer, onChange: (e) => setAnswer(e.target.value), required: true, className: "h-11" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: isAr ? "كلمة المرور الجديدة" : "New Password" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: "password",
                value: newPassword,
                onChange: (e) => setNewPassword(e.target.value),
                required: true,
                className: "h-11"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: isAr ? "تأكيد كلمة المرور" : "Confirm Password" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: "password",
                value: confirm,
                onChange: (e) => setConfirm(e.target.value),
                required: true,
                className: "h-11"
              }
            )
          ] }),
          error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 mt-0.5 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: error })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: loading, className: "w-full h-11", children: loading ? isAr ? "جارٍ..." : "Loading..." : isAr ? "إعادة التعيين" : "Reset" })
        ] }),
        step === "done" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-16 h-16 text-green-600 mx-auto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold", children: isAr ? "تم إعادة تعيين كلمة المرور" : "Password Reset Successful" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => navigate("/"), className: "w-full h-11", children: isAr ? "تسجيل الدخول" : "Sign in" })
        ] })
      ] }) })
    }
  );
}
export {
  ForgotPasswordPage as default
};
//# sourceMappingURL=forgot-password-CVNUOivv.js.map
