import { useContext, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { GitMerge, FileSpreadsheet } from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DatasetItem {
  id: number;
  name: string;
  fileName: string;
  rowCount: number;
  columns: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  datasets: DatasetItem[];
}

interface PreviewResult {
  unionCols: string[];
  totalRows: number;
  filesInfo: { id: number; name: string; rowCount: number; columns: string[] }[];
}

export default function MergeDialog({ open, onOpenChange, datasets }: Props) {
  const { t, lang } = useContext(LangContext);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [newName, setNewName] = useState("");
  const [includeSource, setIncludeSource] = useState(true);
  const [sourceColumnName, setSourceColumnName] = useState(t.merge.sourceColumnDefault);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setNewName("");
      setPreview(null);
      setSourceColumnName(t.merge.sourceColumnDefault);
    }
  }, [open, t.merge.sourceColumnDefault]);

  const toggleId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setPreview(null);
  };

  const previewMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/datasets/merge-preview", {
        sourceIds: selectedIds,
      });
      return res.json() as Promise<PreviewResult>;
    },
    onSuccess: (data) => setPreview(data),
  });

  const mergeMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/datasets/merge", {
        sourceIds: selectedIds,
        name: newName.trim(),
        includeSource,
        sourceColumnName: sourceColumnName.trim() || t.merge.sourceColumnDefault,
      });
      return res.json();
    },
    onSuccess: (data: { dataset: { id: number; rowCount: number }; columns: string[] }) => {
      qc.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({
        title: t.merge.success
          .replace("{rows}", String(data.dataset.rowCount))
          .replace("{cols}", String(data.columns.length)),
      });
      onOpenChange(false);
      setLocation(`/datasets/${data.dataset.id}`);
    },
    onError: (e: any) => {
      toast({ title: e?.message || "Error", variant: "destructive" });
    },
  });

  const handleMerge = () => {
    if (selectedIds.length < 2) {
      toast({ title: t.merge.pickAtLeast2, variant: "destructive" });
      return;
    }
    if (!newName.trim()) {
      toast({ title: t.merge.nameRequired, variant: "destructive" });
      return;
    }
    mergeMut.mutate();
  };

  const fmtNum = (n: number) =>
    n.toLocaleString(lang === "ar" ? "ar-EG" : "en-US");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            {t.merge.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">{t.merge.desc}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* اختيار الملفات */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t.merge.sources}</Label>
              <span className="text-xs text-muted-foreground">
                {t.merge.tablesSelected.replace("{n}", String(selectedIds.length))}
              </span>
            </div>
            {datasets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.merge.noFiles}
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {datasets.map((d) => (
                  <label
                    key={d.id}
                    htmlFor={`merge-src-${d.id}`}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      id={`merge-src-${d.id}`}
                      checked={selectedIds.includes(d.id)}
                      onCheckedChange={() => toggleId(d.id)}
                      data-testid={`checkbox-merge-${d.id}`}
                    />
                    <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.fileName}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {fmtNum(d.rowCount)} {t.common.rows}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {d.columns.length} {t.common.columns}
                      </Badge>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* اسم الملف الجديد */}
          <div className="space-y-1.5">
            <Label htmlFor="merge-name" className="text-sm font-medium">
              {t.merge.newName}
            </Label>
            <Input
              id="merge-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.merge.newNamePlaceholder}
              data-testid="input-merge-name"
            />
          </div>

          {/* خيار عمود المصدر */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={includeSource}
                onCheckedChange={(v) => setIncludeSource(v === true)}
                data-testid="checkbox-include-source"
              />
              <span className="text-sm">{t.merge.includeSource}</span>
            </label>
            {includeSource && (
              <Input
                value={sourceColumnName}
                onChange={(e) => setSourceColumnName(e.target.value)}
                placeholder={t.merge.sourceColumnName}
                className="w-64"
                data-testid="input-source-col-name"
              />
            )}
          </div>

          {/* معاينة */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t.merge.columnsPreview}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => previewMut.mutate()}
                disabled={selectedIds.length === 0 || previewMut.isPending}
                data-testid="button-merge-preview"
              >
                {t.merge.previewBtn}
              </Button>
            </div>
            {preview && (
              <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default">
                    {t.merge.rowCount}: {fmtNum(preview.totalRows)}
                  </Badge>
                  <Badge variant="secondary">
                    {preview.unionCols.length + (includeSource ? 1 : 0)}{" "}
                    {t.common.columns}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {preview.unionCols.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px] font-normal">
                      {c}
                    </Badge>
                  ))}
                  {includeSource && (
                    <Badge variant="default" className="text-[10px] font-normal">
                      + {sourceColumnName.trim() || t.merge.sourceColumnDefault}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleMerge}
            disabled={mergeMut.isPending || selectedIds.length < 2 || !newName.trim()}
            data-testid="button-confirm-merge"
          >
            <GitMerge className="w-4 h-4 me-2" />
            {t.merge.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
