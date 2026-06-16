import { useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LangContext } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users as UsersIcon, User as UserIcon } from "lucide-react";

interface AccessUser {
  id: number;
  username: string;
  role: string;
  has_access: number;
  permission?: string; // view | edit | delete
}

interface Group {
  id: number;
  name: string;
}

interface ShareDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: number;
  datasetName: string;
}

type Tab = "users" | "groups";

const PERMS = ["view", "edit", "delete"] as const;
type Perm = typeof PERMS[number];

export function ShareDatasetDialog({
  open,
  onOpenChange,
  datasetId,
  datasetName,
}: ShareDatasetDialogProps) {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("users");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [permissions, setPermissions] = useState<Record<number, Perm>>({});
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());

  const { data: accessData, isLoading: accessLoading } = useQuery<{
    owner_id: number | null;
    users: AccessUser[];
  }>({
    queryKey: ["/api/datasets", datasetId, "access"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/datasets/${datasetId}/access`);
      return await res.json();
    },
    enabled: open,
  });

  const { data: groupsData } = useQuery<{ groups: Group[] }>({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/groups");
      return await res.json();
    },
    enabled: open,
  });

  const { data: groupAccessData } = useQuery<{ groupIds: number[] }>({
    queryKey: ["/api/datasets", datasetId, "group-access"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/datasets/${datasetId}/group-access`);
      return await res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (accessData?.users) {
      const initial = new Set<number>();
      const perms: Record<number, Perm> = {};
      accessData.users.forEach((u) => {
        if (u.has_access === 1) {
          initial.add(u.id);
          perms[u.id] = ((u.permission as Perm) || "view") as Perm;
        }
      });
      setSelectedIds(initial);
      setPermissions(perms);
    }
  }, [accessData]);

  useEffect(() => {
    if (groupAccessData?.groupIds) {
      setSelectedGroupIds(new Set(groupAccessData.groupIds));
    }
  }, [groupAccessData]);

  const saveUsersMutation = useMutation({
    mutationFn: async () => {
      // 1) حفظ قائمة المستخدمين
      await apiRequest("POST", `/api/datasets/${datasetId}/access`, {
        userIds: Array.from(selectedIds),
      });
      // 2) ضبط الصلاحيات لكل مستخدم
      const perms = Object.entries(permissions).filter(([uid]) =>
        selectedIds.has(Number(uid))
      );
      for (const [uid, perm] of perms) {
        await apiRequest("PATCH", `/api/datasets/${datasetId}/access/${uid}`, {
          permission: perm,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets", datasetId, "access"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({
        title: isAr ? "تم حفظ صلاحيات المشاركة" : "Sharing permissions saved",
      });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: e?.message || (isAr ? "فشل الحفظ" : "Save failed"),
        variant: "destructive",
      });
    },
  });

  const saveGroupsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/datasets/${datasetId}/group-access`, {
        groupIds: Array.from(selectedGroupIds),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets", datasetId, "group-access"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({ title: isAr ? "تم حفظ صلاحيات المجموعات" : "Group permissions saved" });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: e?.message || (isAr ? "فشل الحفظ" : "Save failed"),
        variant: "destructive",
      });
    },
  });

  const toggleUser = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      if (!permissions[id]) {
        setPermissions((p) => ({ ...p, [id]: "view" }));
      }
    }
    setSelectedIds(next);
  };

  const setPerm = (id: number, perm: Perm) => {
    setPermissions((p) => ({ ...p, [id]: perm }));
  };

  const toggleGroup = (id: number) => {
    const next = new Set(selectedGroupIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedGroupIds(next);
  };

  const otherUsers = accessData?.users.filter((u) => u.id !== accessData.owner_id) || [];
  const groups = groupsData?.groups || [];

  const permLabel = (p: Perm) => {
    if (p === "view") return isAr ? "عرض" : "View";
    if (p === "edit") return isAr ? "تعديل" : "Edit";
    return isAr ? "حذف" : "Delete";
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return isAr ? "مسؤول" : "Admin";
    if (role === "editor") return isAr ? "محرر" : "Editor";
    if (role === "viewer") return isAr ? "مشاهد" : "Viewer";
    return isAr ? "مستخدم" : "User";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isAr ? "مشاركة الملف" : "Share Dataset"}</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{datasetName}</span>
            <br />
            {isAr ? "شارك مع مستخدمين أو مجموعات وحدّد الصلاحية" : "Share with users or groups"}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 transition-colors ${
              tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            {isAr ? "مستخدمون" : "Users"}
          </button>
          <button
            onClick={() => setTab("groups")}
            className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 transition-colors ${
              tab === "groups" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            {isAr ? "مجموعات" : "Groups"}
          </button>
        </div>

        {tab === "users" && (
          <div className="max-h-96 overflow-y-auto space-y-2 py-2">
            {accessLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : otherUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isAr ? "لا يوجد مستخدمون آخرون" : "No other users available"}
              </p>
            ) : (
              otherUsers.map((u) => {
                const selected = selectedIds.has(u.id);
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"
                  >
                    <Checkbox checked={selected} onCheckedChange={() => toggleUser(u.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{u.username}</div>
                      <div className="text-xs text-muted-foreground">{roleLabel(u.role)}</div>
                    </div>
                    {selected && (
                      <select
                        value={permissions[u.id] || "view"}
                        onChange={(e) => setPerm(u.id, e.target.value as Perm)}
                        className="text-sm rounded-md border bg-background px-2 py-1"
                      >
                        {PERMS.map((p) => (
                          <option key={p} value={p}>
                            {permLabel(p)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "groups" && (
          <div className="max-h-96 overflow-y-auto space-y-2 py-2">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isAr ? "لا توجد مجموعات. أنشئها من /admin/groups" : "No groups. Create one at /admin/groups"}
              </p>
            ) : (
              groups.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={selectedGroupIds.has(g.id)}
                    onCheckedChange={() => toggleGroup(g.id)}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <UsersIcon className="w-3 h-3" />
                      {g.name}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={() => {
              if (tab === "users") saveUsersMutation.mutate();
              else saveGroupsMutation.mutate();
            }}
            disabled={saveUsersMutation.isPending || saveGroupsMutation.isPending}
          >
            {(saveUsersMutation.isPending || saveGroupsMutation.isPending) && (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            )}
            {isAr ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
