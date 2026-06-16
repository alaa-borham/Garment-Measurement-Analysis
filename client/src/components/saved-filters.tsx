import { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Bookmark, BookmarkPlus, Trash2, Check } from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FilterCondition } from "@shared/schema";

interface SavedFilter {
  id: number;
  name: string;
  filter: { conditions: FilterCondition[]; logic: "AND" | "OR" };
  createdAt: number;
}

interface Props {
  datasetId: number;
  conditions: FilterCondition[];
  logic: "AND" | "OR";
  onApply: (conditions: FilterCondition[], logic: "AND" | "OR") => void;
}

export default function SavedFiltersPanel({
  datasetId,
  conditions,
  logic,
  onApply,
}: Props) {
  const { t } = useContext(LangContext);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);

  const { data: filters = [] } = useQuery<SavedFilter[]>({
    queryKey: ["/api/datasets", datasetId, "filters"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/datasets/${datasetId}/filters`);
      return res.json();
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/datasets/${datasetId}/filters`, {
        name: name.trim(),
        filter: { conditions, logic },
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/datasets", datasetId, "filters"] });
      toast({ title: t.saved.saved });
      setSaveOpen(false);
      setName("");
    },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/datasets/${datasetId}/filters/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/datasets", datasetId, "filters"] });
      toast({ title: t.saved.deleted });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: t.saved.nameRequired, variant: "destructive" });
      return;
    }
    if (conditions.length === 0) {
      toast({ title: t.saved.noConditions, variant: "destructive" });
      return;
    }
    save.mutate();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Bookmark className="w-4 h-4" />
        {t.saved.title}:
      </div>

      {filters.length === 0 ? (
        <span className="text-xs text-muted-foreground">{t.saved.empty}</span>
      ) : (
        filters.map((f) => (
          <div key={f.id} className="flex items-center gap-0.5">
            <Badge
              variant="secondary"
              className="cursor-pointer hover-elevate gap-1 pe-1"
              onClick={() => onApply(f.filter.conditions, f.filter.logic)}
              data-testid={`saved-filter-${f.id}`}
            >
              <Check className="w-3 h-3" />
              <span>{f.name}</span>
              <span className="text-muted-foreground text-[10px]">
                ({f.filter.conditions.length})
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="ms-1 hover:text-destructive p-0.5 rounded"
                    aria-label="delete"
                    data-testid={`delete-saved-${f.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.saved.confirmDelete}</AlertDialogTitle>
                    <AlertDialogDescription>{f.name}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => del.mutate(f.id)}
                    >
                      {t.common.delete}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Badge>
          </div>
        ))
      )}

      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" data-testid="button-save-filter">
            <BookmarkPlus className="w-4 h-4 me-1" />
            {t.saved.saveBtn}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t.saved.nameLabel}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.saved.namePlaceholder}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                data-testid="input-filter-name"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={save.isPending}
              className="w-full"
              size="sm"
              data-testid="button-confirm-save-filter"
            >
              {t.common.save}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
