import { useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MergeDialog from "@/components/merge-dialog";
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
import { FileSpreadsheet, Upload, Trash2, ArrowLeft, ArrowRight, GitMerge, Copy, Share2 } from "lucide-react";
import { useLocation } from "wouter";
import { LangContext } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOpenTabs } from "@/lib/open-tabs";
import { useAuth } from "@/components/auth-gate";
import { ShareDatasetDialog } from "@/components/share-dataset-dialog";

interface DatasetItem {
  id: number;
  name: string;
  fileName: string;
  columns: string[];
  rowCount: number;
  createdAt: number;
  ownerId?: number | null;
  owner_id?: number | null;
}

export default function HomePage() {
  const { t, lang } = useContext(LangContext);
  const { toast } = useToast();
  const [mergeOpen, setMergeOpen] = useState(false);
  const { openNew } = useOpenTabs();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState<{ id: number; name: string } | null>(null);

  const openInNewTab = (dsId: number, name: string) => {
    openNew(dsId, name);
    setLocation(`/datasets/${dsId}`);
  };
  const { data, isLoading } = useQuery<DatasetItem[]>({
    queryKey: ["/api/datasets"],
  });

  const delMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/datasets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({ title: lang === "ar" ? "تم الحذف" : "Deleted" });
    },
  });

  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold mb-2" data-testid="text-page-title">
            {t.home.title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.home.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {data && data.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setMergeOpen(true)}
              data-testid="button-open-merge"
            >
              <GitMerge className="w-4 h-4 me-1" />
              {t.merge.button}
            </Button>
          )}
          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover-elevate"
            data-testid="button-upload"
          >
            <Upload className="w-4 h-4" />
            {t.home.uploadBtn}
          </Link>
        </div>
      </div>

      <MergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        datasets={data || []}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-40" />
            </Card>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-accent-foreground" />
            </div>
            <p className="text-muted-foreground max-w-md">{t.home.empty}</p>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover-elevate"
              data-testid="button-upload-empty"
            >
              <Upload className="w-4 h-4" />
              {t.home.uploadBtn}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((d) => (
            <Card
              key={d.id}
              className="hover-elevate transition-shadow"
              data-testid={`card-dataset-${d.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {d.name}
                  </CardTitle>
                  <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
                </div>
                <div className="text-xs text-muted-foreground truncate" data-testid={`text-filename-${d.id}`}>
                  {d.fileName}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" data-testid={`badge-rows-${d.id}`}>
                    {d.rowCount.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} {t.common.rows}
                  </Badge>
                  <Badge variant="outline">
                    {d.columns.length} {t.common.columns}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  {new Date(d.createdAt).toLocaleString(
                    lang === "ar" ? "ar-EG" : "en-US"
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/datasets/${d.id}`}
                    className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium h-8 px-3 bg-primary text-primary-foreground hover-elevate"
                    data-testid={`button-open-${d.id}`}
                  >
                    {t.home.view}
                    <Arrow className="w-4 h-4" />
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openInNewTab(d.id, d.name)}
                    data-testid={`button-open-new-${d.id}`}
                    title={lang === "ar" ? "فتح في تبويب جديد" : "Open in a new tab"}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {/* زر المشاركة - يظهر للأدمن أو لمالك الملف */}
                  {user && (
                    user.role === "admin" ||
                    user.id === (d.ownerId ?? (d as any).owner_id)
                  ) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShareOpen({ id: d.id, name: d.name })}
                      title={lang === "ar" ? "مشاركة" : "Share"}
                      data-testid={`button-share-${d.id}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" data-testid={`button-delete-${d.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.home.confirmDelete}</AlertDialogTitle>
                        <AlertDialogDescription>{d.name}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => delMutation.mutate(d.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {t.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {shareOpen && (
        <ShareDatasetDialog
          open={!!shareOpen}
          onOpenChange={(o) => { if (!o) setShareOpen(null); }}
          datasetId={shareOpen.id}
          datasetName={shareOpen.name}
        />
      )}
    </div>
  );
}
