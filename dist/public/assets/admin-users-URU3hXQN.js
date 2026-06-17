import { c as createLucideIcon, r as reactExports, L as LangContext, g as useAuth, h as useToast, j as jsxRuntimeExports, C as Card, a as CardContent, i as CircleAlert, U as Users, B as Button, k as CardHeader, l as CardTitle, m as Badge, S as Select, n as SelectTrigger, o as SelectValue, p as SelectContent, q as SelectItem, T as Trash2, D as Dialog, s as DialogContent, t as DialogHeader, v as DialogTitle, w as Label, I as Input, x as DialogFooter, y as RotateCcw, A as AlertDialog, z as AlertDialogContent, G as AlertDialogHeader, H as AlertDialogTitle, J as AlertDialogDescription, K as AlertDialogFooter, M as AlertDialogCancel, N as AlertDialogAction } from "./index-klzEDF9_.js";
import { U as UserPlus } from "./user-plus-Bl5yU7KB.js";
const Key = createLucideIcon("Key", [
  ["path", { d: "m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4", key: "g0fldk" }],
  ["path", { d: "m21 2-9.6 9.6", key: "1j0ho8" }],
  ["circle", { cx: "7.5", cy: "15.5", r: "5.5", key: "yqb3hr" }]
]);
const Settings2 = createLucideIcon("Settings2", [
  ["path", { d: "M20 7h-9", key: "3s1dr2" }],
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
]);
const Shield = createLucideIcon("Shield", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ]
]);
const ROLES = [
  { value: "admin", labelAr: "مسؤول", labelEn: "Admin", color: "destructive" },
  { value: "editor", labelAr: "محرر", labelEn: "Editor", color: "default" },
  { value: "viewer", labelAr: "مشاهد", labelEn: "Viewer", color: "secondary" },
  { value: "user", labelAr: "مستخدم", labelEn: "User", color: "outline" }
];
function getRoleLabel(role, isAr) {
  const r = ROLES.find((x) => x.value === role);
  if (!r) return role;
  return isAr ? r.labelAr : r.labelEn;
}
const FEATURE_LABELS = {
  upload: { ar: "رفع الملفات", en: "Upload files", group: "data" },
  explore: { ar: "استعراض البيانات", en: "Explore data", group: "view" },
  analyze: { ar: "تحليل أساسي", en: "Basic analysis", group: "view" },
  pivot: { ar: "جداول محورية", en: "Pivot tables", group: "view" },
  chart: { ar: "الرسوم البيانية", en: "Charts", group: "view" },
  compare: { ar: "مقارنة داخل الملف", en: "In-file compare", group: "view" },
  compare_files: { ar: "مقارنة الملفات", en: "Compare files", group: "view" },
  multi_analysis: { ar: "تحليل متعدد الملفات", en: "Multi-file analysis", group: "view" },
  templates: { ar: "القوالب", en: "Templates", group: "view" },
  export: { ar: "التصدير", en: "Export", group: "data" },
  edit_rows: { ar: "تعديل الصفوف", en: "Edit rows", group: "data" },
  delete_dataset: { ar: "حذف الملفات", en: "Delete datasets", group: "admin" },
  share_dataset: { ar: "مشاركة الملفات", en: "Share datasets", group: "admin" },
  comments: { ar: "التعليقات", en: "Comments", group: "view" }
};
const GROUP_LABELS = {
  data: { ar: "البيانات", en: "Data" },
  view: { ar: "العرض والتحليل", en: "View & Analysis" },
  admin: { ar: "إدارة", en: "Admin" }
};
function AdminUsersPage() {
  const { lang } = reactExports.useContext(LangContext);
  const isAr = lang === "ar";
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState("");
  const [createOpen, setCreateOpen] = reactExports.useState(false);
  const [newUsername, setNewUsername] = reactExports.useState("");
  const [newPassword, setNewPassword] = reactExports.useState("");
  const [newRole, setNewRole] = reactExports.useState("user");
  const [creating, setCreating] = reactExports.useState(false);
  const [passwordTarget, setPasswordTarget] = reactExports.useState(null);
  const [resetPassword, setResetPassword] = reactExports.useState("");
  const [resettingPwd, setResettingPwd] = reactExports.useState(false);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [deleting, setDeleting] = reactExports.useState(false);
  const [permsTarget, setPermsTarget] = reactExports.useState(null);
  const [permsLoading, setPermsLoading] = reactExports.useState(false);
  const [permsSaving, setPermsSaving] = reactExports.useState(false);
  const [permsList, setPermsList] = reactExports.useState([]);
  const [permsValues, setPermsValues] = reactExports.useState({});
  const [permsIsCustom, setPermsIsCustom] = reactExports.useState(false);
  const [permsDefaults, setPermsDefaults] = reactExports.useState({});
  const openPermsDialog = async (u) => {
    setPermsTarget(u);
    setPermsLoading(true);
    try {
      const res = await fetch(`/api/auth/users/${u.id}/permissions`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setPermsList(Array.isArray(data.features) ? data.features : []);
      setPermsValues(data.permissions || {});
      setPermsDefaults(data.defaults || {});
      setPermsIsCustom(!!data.isCustom);
    } catch (e) {
      toast({
        title: isAr ? "تعذر تحميل الصلاحيات" : "Failed to load permissions",
        variant: "destructive"
      });
      setPermsTarget(null);
    } finally {
      setPermsLoading(false);
    }
  };
  const savePermissions = async (toDefaults) => {
    if (!permsTarget) return;
    setPermsSaving(true);
    try {
      const body = JSON.stringify({
        permissions: toDefaults ? null : permsValues
      });
      const res = await fetch(`/api/auth/users/${permsTarget.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body
      });
      if (!res.ok) throw new Error("failed");
      toast({
        title: isAr ? "تم حفظ الصلاحيات" : "Permissions saved"
      });
      setPermsTarget(null);
    } catch (e) {
      toast({
        title: isAr ? "تعذر حفظ الصلاحيات" : "Failed to save permissions",
        variant: "destructive"
      });
    } finally {
      setPermsSaving(false);
    }
  };
  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/users");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (isAr ? "فشل التحميل" : "Load failed"));
        setLoading(false);
        return;
      }
      setUsers(data.users || []);
    } catch {
      setError(isAr ? "تعذّر الاتصال بالخادم" : "Cannot connect to server");
    }
    setLoading(false);
  };
  reactExports.useEffect(() => {
    loadUsers();
  }, []);
  if (currentUser && currentUser.role !== "admin") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-2xl mx-auto mt-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-8 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-12 h-12 mx-auto text-destructive mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold mb-2", children: isAr ? "غير مصرّح" : "Unauthorized" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: isAr ? "هذه الصفحة متاحة لحسابات المسؤولين فقط" : "This page is for admin accounts only" })
    ] }) }) });
  }
  const handleCreate = async () => {
    if (!newUsername || !newPassword) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "اسم المستخدم وكلمة المرور مطلوبان" : "Username and password required",
        variant: "destructive"
      });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: isAr ? "فشل الإنشاء" : "Create failed",
          description: data.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: isAr ? "تم بنجاح" : "Success",
          description: isAr ? "تم إنشاء المستخدم" : "User created"
        });
        setCreateOpen(false);
        setNewUsername("");
        setNewPassword("");
        setNewRole("user");
        loadUsers();
      }
    } catch {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "تعذّر الاتصال" : "Connection failed",
        variant: "destructive"
      });
    }
    setCreating(false);
  };
  const handleRoleChange = async (userId, newRole2) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole2 })
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: isAr ? "فشل التعديل" : "Update failed",
          description: data.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: isAr ? "تم التحديث" : "Updated",
          description: isAr ? "تم تغيير الصلاحية" : "Role updated"
        });
        loadUsers();
      }
    } catch {
      toast({
        title: isAr ? "خطأ" : "Error",
        variant: "destructive"
      });
    }
  };
  const handleResetPassword = async () => {
    if (!passwordTarget || !resetPassword) return;
    setResettingPwd(true);
    try {
      const res = await fetch(
        `/api/auth/users/${passwordTarget.id}/password`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: resetPassword })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: isAr ? "فشل" : "Failed",
          description: data.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: isAr ? "تم بنجاح" : "Success",
          description: isAr ? "تم تغيير كلمة المرور" : "Password changed"
        });
        setPasswordTarget(null);
        setResetPassword("");
      }
    } catch {
      toast({
        title: isAr ? "خطأ" : "Error",
        variant: "destructive"
      });
    }
    setResettingPwd(false);
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/auth/users/${deleteTarget.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: isAr ? "فشل الحذف" : "Delete failed",
          description: data.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: isAr ? "تم الحذف" : "Deleted",
          description: isAr ? "تم حذف المستخدم" : "User deleted"
        });
        setDeleteTarget(null);
        loadUsers();
      }
    } catch {
      toast({
        title: isAr ? "خطأ" : "Error",
        variant: "destructive"
      });
    }
    setDeleting(false);
  };
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString(
      isAr ? "ar-SA" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-6 h-6" }),
          isAr ? "إدارة المستخدمين" : "User Management"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: isAr ? "إنشاء وتعديل وحذف حسابات المستخدمين والصلاحيات" : "Create, edit, and delete user accounts and permissions" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          onClick: () => setCreateOpen(true),
          "data-testid": "button-create-user",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "w-4 h-4 me-2" }),
            isAr ? "إضافة مستخدم" : "Add User"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: isAr ? `قائمة المستخدمين (${users.length})` : `Users (${users.length})` }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-8 text-muted-foreground", children: isAr ? "جارٍ التحميل..." : "Loading..." }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: error })
      ] }) : users.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-8 text-muted-foreground", children: isAr ? "لا يوجد مستخدمون" : "No users" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-muted-foreground text-start", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-start p-3 font-medium", children: isAr ? "المعرف" : "ID" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-start p-3 font-medium", children: isAr ? "اسم المستخدم" : "Username" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-start p-3 font-medium", children: isAr ? "الصلاحية" : "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-start p-3 font-medium", children: isAr ? "تاريخ الإنشاء" : "Created" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-end p-3 font-medium", children: isAr ? "الإجراءات" : "Actions" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: users.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            className: "border-b hover:bg-muted/40",
            "data-testid": `row-user-${u.id}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-muted-foreground", children: u.id }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                u.username,
                currentUser?.id === u.id && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-xs", children: isAr ? "أنت" : "You" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: u.role,
                  onValueChange: (v) => handleRoleChange(u.id, v),
                  disabled: currentUser?.id === u.id,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      SelectTrigger,
                      {
                        className: "w-32 h-8",
                        "data-testid": `select-role-${u.id}`,
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-3 h-3" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: getRoleLabel(u.role, isAr) })
                        ] }) })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ROLES.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: r.value, children: isAr ? r.labelAr : r.labelEn }, r.value)) })
                  ]
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-muted-foreground", children: formatDate(u.created_at) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 justify-end", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "sm",
                    onClick: () => {
                      setPasswordTarget(u);
                      setResetPassword("");
                    },
                    title: isAr ? "إعادة تعيين كلمة المرور" : "Reset password",
                    "data-testid": `button-reset-${u.id}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { className: "w-4 h-4" })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "sm",
                    onClick: () => openPermsDialog(u),
                    disabled: u.role === "admin",
                    title: isAr ? "صلاحيات الميزات" : "Feature permissions",
                    "data-testid": `button-perms-${u.id}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings2, { className: "w-4 h-4" })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "sm",
                    onClick: () => setDeleteTarget(u),
                    disabled: currentUser?.id === u.id,
                    title: isAr ? "حذف" : "Delete",
                    className: "text-destructive hover:text-destructive",
                    "data-testid": `button-delete-${u.id}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" })
                  }
                )
              ] }) })
            ]
          },
          u.id
        )) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: isAr ? "شرح الصلاحيات" : "Roles Reference" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 p-3 rounded-md border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "destructive", className: "shrink-0", children: isAr ? "مسؤول" : "Admin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: isAr ? "صلاحيات كاملة، يستطيع إدارة المستخدمين" : "Full access, can manage users" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 p-3 rounded-md border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "default", className: "shrink-0", children: isAr ? "محرر" : "Editor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: isAr ? "إضافة وتعديل البيانات والتحليلات" : "Add and edit data and analyses" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 p-3 rounded-md border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: "shrink-0", children: isAr ? "مشاهد" : "Viewer" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: isAr ? "عرض البيانات والتحليلات فقط" : "View data and analyses only" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 p-3 rounded-md border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "shrink-0", children: isAr ? "مستخدم" : "User" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: isAr ? "الصلاحية الافتراضية للمستخدمين الجدد" : "Default for new users" })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: createOpen, onOpenChange: setCreateOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: isAr ? "إضافة مستخدم جديد" : "Add New User" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "new-username", children: isAr ? "اسم المستخدم" : "Username" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              id: "new-username",
              value: newUsername,
              onChange: (e) => setNewUsername(e.target.value),
              placeholder: isAr ? "مثال: ahmed" : "e.g. ahmed",
              autoComplete: "off",
              "data-testid": "input-new-username"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "new-password", children: isAr ? "كلمة المرور" : "Password" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              id: "new-password",
              type: "password",
              value: newPassword,
              onChange: (e) => setNewPassword(e.target.value),
              placeholder: "••••••••",
              autoComplete: "new-password",
              "data-testid": "input-new-password"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: isAr ? "4 أحرف على الأقل" : "At least 4 characters" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "new-role", children: isAr ? "الصلاحية" : "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: newRole, onValueChange: setNewRole, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { id: "new-role", "data-testid": "select-new-role", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ROLES.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: r.value, children: isAr ? r.labelAr : r.labelEn }, r.value)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline",
            onClick: () => setCreateOpen(false),
            disabled: creating,
            children: isAr ? "إلغاء" : "Cancel"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            onClick: handleCreate,
            disabled: creating,
            "data-testid": "button-confirm-create",
            children: creating ? isAr ? "جارٍ الإنشاء..." : "Creating..." : isAr ? "إنشاء" : "Create"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Dialog,
      {
        open: !!passwordTarget,
        onOpenChange: (o) => !o && setPasswordTarget(null),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: isAr ? `إعادة تعيين كلمة المرور: ${passwordTarget?.username}` : `Reset Password: ${passwordTarget?.username}` }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "reset-password", children: isAr ? "كلمة المرور الجديدة" : "New Password" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                id: "reset-password",
                type: "password",
                value: resetPassword,
                onChange: (e) => setResetPassword(e.target.value),
                placeholder: "••••••••",
                autoComplete: "new-password",
                "data-testid": "input-reset-password"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: isAr ? "سيتم تسجيل خروج المستخدم تلقائياً" : "User will be logged out automatically" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outline",
                onClick: () => setPasswordTarget(null),
                disabled: resettingPwd,
                children: isAr ? "إلغاء" : "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                onClick: handleResetPassword,
                disabled: resettingPwd || resetPassword.length < 4,
                "data-testid": "button-confirm-reset",
                children: resettingPwd ? isAr ? "جارٍ الحفظ..." : "Saving..." : isAr ? "حفظ" : "Save"
              }
            )
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Dialog,
      {
        open: !!permsTarget,
        onOpenChange: (o) => !o && setPermsTarget(null),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-2xl max-h-[85vh] overflow-y-auto", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
            isAr ? "صلاحيات الميزات" : "Feature Permissions",
            permsTarget && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-muted-foreground ms-2 font-normal", children: [
              "(",
              permsTarget.username,
              ")"
            ] })
          ] }) }),
          permsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: isAr ? "جارٍ التحميل..." : "Loading..." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: permsIsCustom ? "default" : "secondary", children: permsIsCustom ? isAr ? "صلاحيات مخصصة" : "Custom permissions" : isAr ? "صلاحيات افتراضية حسب الدور" : "Defaults by role" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                isAr ? "الدور:" : "Role:",
                " ",
                permsTarget && getRoleLabel(permsTarget.role, isAr)
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap p-2 rounded-md bg-muted/40 border", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: isAr ? "افتراضات سريعة:" : "Quick presets:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-7 text-xs",
                  onClick: () => {
                    const next = {};
                    permsList.forEach((f) => {
                      next[f] = false;
                    });
                    ["explore", "analyze"].forEach((f) => {
                      if (permsList.includes(f)) next[f] = true;
                    });
                    setPermsValues(next);
                  },
                  "data-testid": "preset-viewer",
                  children: isAr ? "قارئ فقط" : "Viewer only"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-7 text-xs",
                  onClick: () => {
                    const next = {};
                    permsList.forEach((f) => {
                      next[f] = false;
                    });
                    ["explore", "analyze", "pivot", "chart", "compare", "compare_files", "multi_analysis", "templates", "export", "comments"].forEach((f) => {
                      if (permsList.includes(f)) next[f] = true;
                    });
                    setPermsValues(next);
                  },
                  "data-testid": "preset-analyst",
                  children: isAr ? "محلّل" : "Analyst"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-7 text-xs",
                  onClick: () => {
                    const next = {};
                    permsList.forEach((f) => {
                      next[f] = !["delete_dataset", "share_dataset"].includes(f);
                    });
                    setPermsValues(next);
                  },
                  "data-testid": "preset-editor",
                  children: isAr ? "محرر" : "Editor"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-7 text-xs",
                  onClick: () => {
                    const next = {};
                    permsList.forEach((f) => {
                      next[f] = true;
                    });
                    setPermsValues(next);
                  },
                  "data-testid": "preset-all",
                  children: isAr ? "تفعيل الكل" : "Enable all"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-7 text-xs",
                  onClick: () => {
                    const next = {};
                    permsList.forEach((f) => {
                      next[f] = false;
                    });
                    setPermsValues(next);
                  },
                  "data-testid": "preset-none",
                  children: isAr ? "إيقاف الكل" : "Disable all"
                }
              )
            ] }),
            ["data", "view", "admin"].map((group) => {
              const feats = permsList.filter(
                (f) => FEATURE_LABELS[f]?.group === group
              );
              if (feats.length === 0) return null;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border rounded-md p-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold mb-2", children: isAr ? GROUP_LABELS[group].ar : GROUP_LABELS[group].en }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: feats.map((f) => {
                  const meta = FEATURE_LABELS[f];
                  const checked = !!permsValues[f];
                  const def = !!permsDefaults[f];
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "label",
                    {
                      className: "flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer text-sm",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "input",
                          {
                            type: "checkbox",
                            checked,
                            onChange: (e) => setPermsValues((prev) => ({
                              ...prev,
                              [f]: e.target.checked
                            })),
                            className: "w-4 h-4"
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: isAr ? meta.ar : meta.en }),
                        checked !== def && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[10px]", children: isAr ? "مخصص" : "custom" })
                      ]
                    },
                    f
                  );
                }) })
              ] }, group);
            })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                variant: "outline",
                onClick: () => savePermissions(true),
                disabled: permsSaving || permsLoading,
                "data-testid": "button-perms-reset",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "w-4 h-4 me-1" }),
                  isAr ? "استعادة الافتراضي" : "Restore defaults"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                onClick: () => setPermsTarget(null),
                disabled: permsSaving,
                children: isAr ? "إلغاء" : "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                onClick: () => savePermissions(false),
                disabled: permsSaving || permsLoading,
                "data-testid": "button-perms-save",
                children: permsSaving ? isAr ? "جارٍ الحفظ..." : "Saving..." : isAr ? "حفظ" : "Save"
              }
            )
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AlertDialog,
      {
        open: !!deleteTarget,
        onOpenChange: (o) => !o && setDeleteTarget(null),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: isAr ? "تأكيد الحذف" : "Confirm Delete" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: isAr ? `هل تريد فعلاً حذف المستخدم "${deleteTarget?.username}"؟ هذا الإجراء لا يمكن التراجع عنه.` : `Really delete user "${deleteTarget?.username}"? This cannot be undone.` })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { disabled: deleting, children: isAr ? "إلغاء" : "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AlertDialogAction,
              {
                onClick: handleDelete,
                disabled: deleting,
                className: "bg-destructive hover:bg-destructive/90",
                "data-testid": "button-confirm-delete",
                children: deleting ? isAr ? "جارٍ الحذف..." : "Deleting..." : isAr ? "حذف" : "Delete"
              }
            )
          ] })
        ] })
      }
    )
  ] });
}
export {
  AdminUsersPage as default
};
//# sourceMappingURL=admin-users-URU3hXQN.js.map
