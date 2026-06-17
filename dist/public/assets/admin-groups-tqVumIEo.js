import { g as useAuth, r as reactExports, L as LangContext, j as jsxRuntimeExports, C as Card, a as CardContent, O as Link, B as Button, P as ArrowRight, Q as ArrowLeft, D as Dialog, W as DialogTrigger, Y as Plus, s as DialogContent, t as DialogHeader, v as DialogTitle, w as Label, I as Input, x as DialogFooter, k as CardHeader, l as CardTitle, U as Users, m as Badge, T as Trash2 } from "./index-klzEDF9_.js";
import { S as ShieldAlert } from "./shield-alert-C3BiYQFb.js";
import { U as UserPlus } from "./user-plus-Bl5yU7KB.js";
function AdminGroupsPage() {
  const { user } = useAuth();
  const { lang } = reactExports.useContext(LangContext);
  const isAr = lang === "ar";
  const [groups, setGroups] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [createOpen, setCreateOpen] = reactExports.useState(false);
  const [newName, setNewName] = reactExports.useState("");
  const [newDesc, setNewDesc] = reactExports.useState("");
  const [error, setError] = reactExports.useState("");
  const [membersDialog, setMembersDialog] = reactExports.useState(null);
  const [members, setMembers] = reactExports.useState([]);
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/groups");
      if (r.ok) {
        const d = await r.json();
        setGroups(d.groups || []);
      }
    } catch {
    }
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const create = async () => {
    setError("");
    if (!newName.trim()) {
      setError(isAr ? "اسم المجموعة مطلوب" : "Group name required");
      return;
    }
    const r = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc })
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error || "Error");
      return;
    }
    setNewName("");
    setNewDesc("");
    setCreateOpen(false);
    load();
  };
  const remove = async (id) => {
    if (!confirm(isAr ? "هل تريد حذف المجموعة؟" : "Delete group?")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    load();
  };
  const openMembers = async (g) => {
    setMembersDialog(g);
    const r = await fetch(`/api/groups/${g.id}/members`);
    if (r.ok) {
      const d = await r.json();
      setMembers(d.users || []);
    }
  };
  const toggleMember = (uid) => {
    setMembers((prev) => prev.map((u) => u.id === uid ? { ...u, is_member: u.is_member ? 0 : 1 } : u));
  };
  const saveMembers = async () => {
    if (!membersDialog) return;
    const userIds = members.filter((u) => u.is_member).map((u) => u.id);
    await fetch(`/api/groups/${membersDialog.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds })
    });
    setMembersDialog(null);
    load();
  };
  if (user && user.role !== "admin") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { dir: isAr ? "rtl" : "ltr", className: "min-h-screen p-6 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "max-w-md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-8 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "w-12 h-12 text-destructive mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold mb-2", children: isAr ? "غير مصرح" : "Forbidden" })
    ] }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { dir: isAr ? "rtl" : "ltr", className: "min-h-screen bg-background p-4 md:p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-5xl mx-auto space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { href: "/", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", children: isAr ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "w-4 h-4" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: isAr ? "إدارة المجموعات" : "Groups Management" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: createOpen, onOpenChange: setCreateOpen, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 me-2" }),
          isAr ? "مجموعة جديدة" : "New group"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { dir: isAr ? "rtl" : "ltr", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: isAr ? "إنشاء مجموعة" : "Create group" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: isAr ? "اسم المجموعة" : "Name" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: newName, onChange: (e) => setNewName(e.target.value), autoFocus: true })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: isAr ? "الوصف (اختياري)" : "Description (optional)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: newDesc, onChange: (e) => setNewDesc(e.target.value) })
            ] }),
            error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-destructive", children: error })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setCreateOpen(false), children: isAr ? "إلغاء" : "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: create, children: isAr ? "إنشاء" : "Create" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: isAr ? `المجموعات (${groups.length})` : `Groups (${groups.length})` }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-muted-foreground", children: isAr ? "جارٍ التحميل..." : "Loading..." }) : groups.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-muted-foreground", children: isAr ? "لا توجد مجموعات بعد. أنشئ مجموعة جديدة." : "No groups yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y", children: groups.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 flex items-center justify-between gap-3 hover:bg-accent/30", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-5 h-5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold", children: g.name }),
            g.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground truncate", children: g.description })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "outline", children: [
            g.member_count,
            " ",
            isAr ? "عضو" : "members"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => openMembers(g), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "w-4 h-4 me-1" }),
            isAr ? "الأعضاء" : "Members"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "text-destructive", onClick: () => remove(g.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" }) })
        ] })
      ] }, g.id)) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!membersDialog, onOpenChange: (o) => !o && setMembersDialog(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { dir: isAr ? "rtl" : "ltr", className: "max-w-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: isAr ? `أعضاء "${membersDialog?.name}"` : `Members of "${membersDialog?.name}"` }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-80 overflow-y-auto space-y-1", children: members.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: u.is_member === 1,
            onChange: () => toggleMember(u.id),
            className: "w-4 h-4"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-sm", children: u.username }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: u.role })
        ] })
      ] }, u.id)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setMembersDialog(null), children: isAr ? "إلغاء" : "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: saveMembers, children: isAr ? "حفظ" : "Save" })
      ] })
    ] }) })
  ] }) });
}
export {
  AdminGroupsPage as default
};
//# sourceMappingURL=admin-groups-tqVumIEo.js.map
