import { useContext, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  Key,
  Trash2,
  Shield,
  Edit,
  AlertCircle,
  Settings2,
  RotateCcw,
} from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { useAuth } from "@/components/auth-gate";

interface AdminUser {
  id: number;
  username: string;
  role: string;
  created_at: number;
}

const ROLES = [
  { value: "admin", labelAr: "مسؤول", labelEn: "Admin", color: "destructive" },
  { value: "editor", labelAr: "محرر", labelEn: "Editor", color: "default" },
  { value: "viewer", labelAr: "مشاهد", labelEn: "Viewer", color: "secondary" },
  { value: "user", labelAr: "مستخدم", labelEn: "User", color: "outline" },
] as const;

function getRoleLabel(role: string, isAr: boolean): string {
  const r = ROLES.find((x) => x.value === role);
  if (!r) return role;
  return isAr ? r.labelAr : r.labelEn;
}

function getRoleVariant(role: string): any {
  const r = ROLES.find((x) => x.value === role);
  return r?.color || "outline";
}

type FeatureMeta = { ar: string; en: string; group: "data" | "view" | "admin" };
const FEATURE_LABELS: Record<string, FeatureMeta> = {
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
  comments: { ar: "التعليقات", en: "Comments", group: "view" },
};
const GROUP_LABELS: Record<string, { ar: string; en: string }> = {
  data: { ar: "البيانات", en: "Data" },
  view: { ar: "العرض والتحليل", en: "View & Analysis" },
  admin: { ar: "إدارة", en: "Admin" },
};

export default function AdminUsersPage() {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);

  // Password reset dialog
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resettingPwd, setResettingPwd] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Permissions dialog state
  const [permsTarget, setPermsTarget] = useState<AdminUser | null>(null);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsList, setPermsList] = useState<string[]>([]);
  const [permsValues, setPermsValues] = useState<Record<string, boolean>>({});
  const [permsIsCustom, setPermsIsCustom] = useState(false);
  const [permsDefaults, setPermsDefaults] = useState<Record<string, boolean>>({});

  const openPermsDialog = async (u: AdminUser) => {
    setPermsTarget(u);
    setPermsLoading(true);
    try {
      const res = await fetch(`/api/auth/users/${u.id}/permissions`, {
        credentials: "include",
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
        variant: "destructive",
      });
      setPermsTarget(null);
    } finally {
      setPermsLoading(false);
    }
  };

  const savePermissions = async (toDefaults: boolean) => {
    if (!permsTarget) return;
    setPermsSaving(true);
    try {
      const body = JSON.stringify({
        permissions: toDefaults ? null : permsValues,
      });
      const res = await fetch(`/api/auth/users/${permsTarget.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body,
      });
      if (!res.ok) throw new Error("failed");
      toast({
        title: isAr ? "تم حفظ الصلاحيات" : "Permissions saved",
      });
      setPermsTarget(null);
    } catch (e) {
      toast({
        title: isAr ? "تعذر حفظ الصلاحيات" : "Failed to save permissions",
        variant: "destructive",
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

  useEffect(() => {
    loadUsers();
  }, []);

  // Permission check
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isAr ? "غير مصرّح" : "Unauthorized"}
            </h2>
            <p className="text-muted-foreground">
              {isAr
                ? "هذه الصفحة متاحة لحسابات المسؤولين فقط"
                : "This page is for admin accounts only"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newUsername || !newPassword) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr
          ? "اسم المستخدم وكلمة المرور مطلوبان"
          : "Username and password required",
        variant: "destructive",
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
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: isAr ? "فشل الإنشاء" : "Create failed",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: isAr ? "تم بنجاح" : "Success",
          description: isAr ? "تم إنشاء المستخدم" : "User created",
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
        variant: "destructive",
      });
    }
    setCreating(false);
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: isAr ? "فشل التعديل" : "Update failed",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: isAr ? "تم التحديث" : "Updated",
          description: isAr ? "تم تغيير الصلاحية" : "Role updated",
        });
        loadUsers();
      }
    } catch {
      toast({
        title: isAr ? "خطأ" : "Error",
        variant: "destructive",
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
          body: JSON.stringify({ newPassword: resetPassword }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: isAr ? "فشل" : "Failed",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: isAr ? "تم بنجاح" : "Success",
          description: isAr
            ? "تم تغيير كلمة المرور"
            : "Password changed",
        });
        setPasswordTarget(null);
        setResetPassword("");
      }
    } catch {
      toast({
        title: isAr ? "خطأ" : "Error",
        variant: "destructive",
      });
    }
    setResettingPwd(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/auth/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: isAr ? "فشل الحذف" : "Delete failed",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: isAr ? "تم الحذف" : "Deleted",
          description: isAr ? "تم حذف المستخدم" : "User deleted",
        });
        setDeleteTarget(null);
        loadUsers();
      }
    } catch {
      toast({
        title: isAr ? "خطأ" : "Error",
        variant: "destructive",
      });
    }
    setDeleting(false);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(
      isAr ? "ar-SA" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            {isAr ? "إدارة المستخدمين" : "User Management"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "إنشاء وتعديل وحذف حسابات المستخدمين والصلاحيات"
              : "Create, edit, and delete user accounts and permissions"}
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          data-testid="button-create-user"
        >
          <UserPlus className="w-4 h-4 me-2" />
          {isAr ? "إضافة مستخدم" : "Add User"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isAr ? `قائمة المستخدمين (${users.length})` : `Users (${users.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {isAr ? "جارٍ التحميل..." : "Loading..."}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isAr ? "لا يوجد مستخدمون" : "No users"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-start">
                    <th className="text-start p-3 font-medium">
                      {isAr ? "المعرف" : "ID"}
                    </th>
                    <th className="text-start p-3 font-medium">
                      {isAr ? "اسم المستخدم" : "Username"}
                    </th>
                    <th className="text-start p-3 font-medium">
                      {isAr ? "الصلاحية" : "Role"}
                    </th>
                    <th className="text-start p-3 font-medium">
                      {isAr ? "تاريخ الإنشاء" : "Created"}
                    </th>
                    <th className="text-end p-3 font-medium">
                      {isAr ? "الإجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b hover:bg-muted/40"
                      data-testid={`row-user-${u.id}`}
                    >
                      <td className="p-3 text-muted-foreground">{u.id}</td>
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-2">
                          {u.username}
                          {currentUser?.id === u.id && (
                            <Badge variant="outline" className="text-xs">
                              {isAr ? "أنت" : "You"}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleRoleChange(u.id, v)}
                          disabled={currentUser?.id === u.id}
                        >
                          <SelectTrigger
                            className="w-32 h-8"
                            data-testid={`select-role-${u.id}`}
                          >
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <Shield className="w-3 h-3" />
                                <span>{getRoleLabel(u.role, isAr)}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {isAr ? r.labelAr : r.labelEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPasswordTarget(u);
                              setResetPassword("");
                            }}
                            title={
                              isAr ? "إعادة تعيين كلمة المرور" : "Reset password"
                            }
                            data-testid={`button-reset-${u.id}`}
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPermsDialog(u)}
                            disabled={u.role === "admin"}
                            title={isAr ? "صلاحيات الميزات" : "Feature permissions"}
                            data-testid={`button-perms-${u.id}`}
                          >
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(u)}
                            disabled={currentUser?.id === u.id}
                            title={isAr ? "حذف" : "Delete"}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* مفتاح الصلاحيات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isAr ? "شرح الصلاحيات" : "Roles Reference"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-md border">
              <Badge variant="destructive" className="shrink-0">
                {isAr ? "مسؤول" : "Admin"}
              </Badge>
              <p className="text-muted-foreground">
                {isAr
                  ? "صلاحيات كاملة، يستطيع إدارة المستخدمين"
                  : "Full access, can manage users"}
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md border">
              <Badge variant="default" className="shrink-0">
                {isAr ? "محرر" : "Editor"}
              </Badge>
              <p className="text-muted-foreground">
                {isAr
                  ? "إضافة وتعديل البيانات والتحليلات"
                  : "Add and edit data and analyses"}
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md border">
              <Badge variant="secondary" className="shrink-0">
                {isAr ? "مشاهد" : "Viewer"}
              </Badge>
              <p className="text-muted-foreground">
                {isAr
                  ? "عرض البيانات والتحليلات فقط"
                  : "View data and analyses only"}
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md border">
              <Badge variant="outline" className="shrink-0">
                {isAr ? "مستخدم" : "User"}
              </Badge>
              <p className="text-muted-foreground">
                {isAr
                  ? "الصلاحية الافتراضية للمستخدمين الجدد"
                  : "Default for new users"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: إنشاء مستخدم */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAr ? "إضافة مستخدم جديد" : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-username">
                {isAr ? "اسم المستخدم" : "Username"}
              </Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={isAr ? "مثال: ahmed" : "e.g. ahmed"}
                autoComplete="off"
                data-testid="input-new-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">
                {isAr ? "كلمة المرور" : "Password"}
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                data-testid="input-new-password"
              />
              <p className="text-xs text-muted-foreground">
                {isAr ? "4 أحرف على الأقل" : "At least 4 characters"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">
                {isAr ? "الصلاحية" : "Role"}
              </Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="new-role" data-testid="select-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {isAr ? r.labelAr : r.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              data-testid="button-confirm-create"
            >
              {creating
                ? isAr
                  ? "جارٍ الإنشاء..."
                  : "Creating..."
                : isAr
                ? "إنشاء"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: إعادة تعيين كلمة مرور */}
      <Dialog
        open={!!passwordTarget}
        onOpenChange={(o) => !o && setPasswordTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAr
                ? `إعادة تعيين كلمة المرور: ${passwordTarget?.username}`
                : `Reset Password: ${passwordTarget?.username}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-password">
                {isAr ? "كلمة المرور الجديدة" : "New Password"}
              </Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                data-testid="input-reset-password"
              />
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "سيتم تسجيل خروج المستخدم تلقائياً"
                  : "User will be logged out automatically"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordTarget(null)}
              disabled={resettingPwd}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resettingPwd || resetPassword.length < 4}
              data-testid="button-confirm-reset"
            >
              {resettingPwd
                ? isAr
                  ? "جارٍ الحفظ..."
                  : "Saving..."
                : isAr
                ? "حفظ"
                : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: صلاحيات الميزات */}
      <Dialog
        open={!!permsTarget}
        onOpenChange={(o) => !o && setPermsTarget(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAr ? "صلاحيات الميزات" : "Feature Permissions"}
              {permsTarget && (
                <span className="text-sm text-muted-foreground ms-2 font-normal">
                  ({permsTarget.username})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {permsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isAr ? "جارٍ التحميل..." : "Loading..."}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <Badge variant={permsIsCustom ? "default" : "secondary"}>
                  {permsIsCustom
                    ? isAr
                      ? "صلاحيات مخصصة"
                      : "Custom permissions"
                    : isAr
                      ? "صلاحيات افتراضية حسب الدور"
                      : "Defaults by role"}
                </Badge>
                <span className="text-muted-foreground">
                  {isAr ? "الدور:" : "Role:"} {permsTarget && getRoleLabel(permsTarget.role, isAr)}
                </span>
              </div>

              {(["data", "view", "admin"] as const).map((group) => {
                const feats = permsList.filter(
                  (f) => FEATURE_LABELS[f]?.group === group,
                );
                if (feats.length === 0) return null;
                return (
                  <div key={group} className="border rounded-md p-3">
                    <div className="text-sm font-semibold mb-2">
                      {isAr ? GROUP_LABELS[group].ar : GROUP_LABELS[group].en}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {feats.map((f) => {
                        const meta = FEATURE_LABELS[f];
                        const checked = !!permsValues[f];
                        const def = !!permsDefaults[f];
                        return (
                          <label
                            key={f}
                            className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setPermsValues((prev) => ({
                                  ...prev,
                                  [f]: e.target.checked,
                                }))
                              }
                              className="w-4 h-4"
                            />
                            <span className="flex-1">
                              {isAr ? meta.ar : meta.en}
                            </span>
                            {checked !== def && (
                              <Badge variant="outline" className="text-[10px]">
                                {isAr ? "مخصص" : "custom"}
                              </Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => savePermissions(true)}
              disabled={permsSaving || permsLoading}
              data-testid="button-perms-reset"
            >
              <RotateCcw className="w-4 h-4 me-1" />
              {isAr ? "استعادة الافتراضي" : "Restore defaults"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPermsTarget(null)}
              disabled={permsSaving}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => savePermissions(false)}
              disabled={permsSaving || permsLoading}
              data-testid="button-perms-save"
            >
              {permsSaving
                ? isAr ? "جارٍ الحفظ..." : "Saving..."
                : isAr ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: تأكيد الحذف */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAr ? "تأكيد الحذف" : "Confirm Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? `هل تريد فعلاً حذف المستخدم "${deleteTarget?.username}"؟ هذا الإجراء لا يمكن التراجع عنه.`
                : `Really delete user "${deleteTarget?.username}"? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {isAr ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleting
                ? isAr
                  ? "جارٍ الحذف..."
                  : "Deleting..."
                : isAr
                ? "حذف"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
