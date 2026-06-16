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
import { Loader2 } from "lucide-react";

interface AccessUser {
  id: number;
  username: string;
  role: string;
  has_access: number;
}

interface ShareDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: number;
  datasetName: string;
}

export function ShareDatasetDialog({
  open,
  onOpenChange,
  datasetId,
  datasetName,
}: ShareDatasetDialogProps) {
  const { lang } = useContext(LangContext);
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<{
    owner_id: number | null;
    users: AccessUser[];
  }>({
    queryKey: ["/api/datasets", datasetId, "access"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/datasets/${datasetId}/access`
      );
      return await res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (data?.users) {
      const initial = new Set<number>();
      data.users.forEach((u) => {
        if (u.has_access === 1) initial.add(u.id);
      });
      setSelectedIds(initial);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/datasets/${datasetId}/access`,
        { userIds: Array.from(selectedIds) }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/datasets", datasetId, "access"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({
        title:
          lang === "ar"
            ? "تم حفظ صلاحيات المشاركة"
            : "Sharing permissions saved",
      });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({
        title: lang === "ar" ? "خطأ" : "Error",
        description: e?.message || (lang === "ar" ? "فشل الحفظ" : "Save failed"),
        variant: "destructive",
      });
    },
  });

  const toggle = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // فلترة المالك من القائمة (لا يمكن مشاركة الملف مع مالكه)
  const otherUsers =
    data?.users.filter((u) => u.id !== data.owner_id) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lang === "ar" ? "مشاركة الملف" : "Share Dataset"}
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{datasetName}</span>
            <br />
            {lang === "ar"
              ? "اختر المستخدمين الذين يمكنهم عرض هذا الملف"
              : "Choose users who can access this dataset"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : otherUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {lang === "ar"
                ? "لا يوجد مستخدمون آخرون"
                : "No other users available"}
            </p>
          ) : (
            otherUsers.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                data-testid={`share-user-${u.id}`}
              >
                <Checkbox
                  checked={selectedIds.has(u.id)}
                  onCheckedChange={() => toggle(u.id)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{u.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.role === "admin"
                      ? lang === "ar"
                        ? "مسؤول"
                        : "Admin"
                      : u.role === "editor"
                      ? lang === "ar"
                        ? "محرر"
                        : "Editor"
                      : u.role === "viewer"
                      ? lang === "ar"
                        ? "مشاهد"
                        : "Viewer"
                      : lang === "ar"
                      ? "مستخدم"
                      : "User"}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-share-cancel"
          >
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-share-save"
          >
            {saveMutation.isPending && (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            )}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
