import { useContext, useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  FileSpreadsheet,
  Upload,
  Trash2,
  ArrowLeft,
  ArrowRight,
  GitMerge,
  Copy,
  Share2,
  Star,
  Search,
  X,
  CheckSquare,
  Square,
  Undo2,
  SlidersHorizontal,
} from "lucide-react";
import { useLocation } from "wouter";
import { LangContext } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
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

// ===== Favorites helper (localStorage) =====
const FAV_KEY = "qiyasat-favorite-datasets";
function getFavorites(): Set<number> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}
function setFavoritesStorage(s: Set<number>) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(s)));
  } catch {}
}

// Trash للحذف القابل للتراجع (in-memory مؤقت بانتظار Soft delete في DB لاحقاً)
const trashMap = new Map<number, ReturnType<typeof setTimeout>>();

export default function HomePage() {
  const { t, lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const { toast } = useToast();
  const [mergeOpen, setMergeOpen] = useState(false);
  const { openNew } = useOpenTabs();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState<{ id: number; name: string } | null>(null);

  // ===== State جديد =====
  const [favorites, setFavorites] = useState<Set<number>>(() => getFavorites());
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterFavOnly, setFilterFavOnly] = useState(false);
  const [filterMinRows, setFilterMinRows] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "rows">("newest");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const openInNewTab = (dsId: number, name: string) => {
    openNew(dsId, name);
    setLocation(`/datasets/${dsId}`);
  };

  const { data, isLoading } = useQuery<DatasetItem[]>({
    queryKey: ["/api/datasets"],
  });

  // === DELETE mutation مع دعم تراجع ===
  const delMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/datasets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
  });

  // ===== Favorites =====
  const toggleFavorite = (id: number) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavorites(next);
    setFavoritesStorage(next);
  };

  // ===== Filtering & sorting =====
  const filtered = useMemo(() => {
    if (!data) return [];
    let out = data.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (d) =>
          d.name.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q)
      );
    }
    if (filterFavOnly) out = out.filter((d) => favorites.has(d.id));
    if (filterMinRows) {
      const min = parseInt(filterMinRows);
      if (!isNaN(min)) out = out.filter((d) => d.rowCount >= min);
    }
    if (filterDateFrom) {
      const fromTs = new Date(filterDateFrom).getTime();
      if (!isNaN(fromTs)) out = out.filter((d) => d.createdAt >= fromTs);
    }
    out.sort((a, b) => {
      // المفضّلة دائماً على القمة
      const af = favorites.has(a.id) ? 1 : 0;
      const bf = favorites.has(b.id) ? 1 : 0;
      if (af !== bf) return bf - af;
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "name":
          return a.name.localeCompare(b.name);
        case "rows":
          return b.rowCount - a.rowCount;
      }
    });
    return out;
  }, [data, search, filterFavOnly, filterMinRows, filterDateFrom, sortBy, favorites]);

  // ===== Selection =====
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  const selectAllVisible = () => {
    setSelectedIds(new Set(filtered.map((d) => d.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());
  useEffect(() => {
    if (!selectionMode) clearSelection();
  }, [selectionMode]);

  // ===== Delete مع Undo Toast =====
  const deleteWithUndo = (ids: number[]) => {
    const names = ids
      .map((id) => data?.find((d) => d.id === id)?.name)
      .filter(Boolean) as string[];
    const summary =
      ids.length === 1
        ? names[0] ?? ""
        : `${ids.length} ${isAr ? "ملف" : "files"}`;

    // فعّل وضع pending
    ids.forEach((id) => {
      if (trashMap.has(id)) {
        clearTimeout(trashMap.get(id)!);
      }
    });
    // اخفِ الملفات من الواجهة مؤقتاً عبر filter trick — نضع لقطة في cache
    const previous = queryClient.getQueryData<DatasetItem[]>(["/api/datasets"]);
    if (previous) {
      queryClient.setQueryData<DatasetItem[]>(
        ["/api/datasets"],
        previous.filter((d) => !ids.includes(d.id))
      );
    }

    let undone = false;
    const timer = setTimeout(() => {
      if (undone) return;
      ids.forEach((id) => trashMap.delete(id));
      // نفّذ الحذف فعلياً
      Promise.all(ids.map((id) => delMutation.mutateAsync(id))).then(() => {
        toast({
          title: isAr ? "تم الحذف" : "Deleted",
          description: summary,
        });
      });
    }, 6000);
    ids.forEach((id) => trashMap.set(id, timer));

    toast({
      title: isAr ? "سيتم الحذف" : "Will delete",
      description: `${summary} — ${isAr ? "اضغط تراجع لإلغاء" : "Click Undo to cancel"}`,
      action: (
        <ToastAction
          altText={isAr ? "تراجع" : "Undo"}
          onClick={() => {
            undone = true;
            clearTimeout(timer);
            ids.forEach((id) => trashMap.delete(id));
            // استعد البيانات
            if (previous) {
              queryClient.setQueryData(["/api/datasets"], previous);
            } else {
              queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
            }
            toast({ title: isAr ? "تم التراجع" : "Undone" });
          }}
        >
          <Undo2 className="w-3.5 h-3.5 me-1" />
          {isAr ? "تراجع" : "Undo"}
        </ToastAction>
      ),
    });
    clearSelection();
  };

  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const hasActiveFilters = !!(
    search ||
    filterFavOnly ||
    filterMinRows ||
    filterDateFrom ||
    sortBy !== "newest"
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold mb-2" data-testid="text-page-title">
            {t.home.title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.home.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setSelectionMode((v) => !v)}
            data-testid="button-toggle-select"
          >
            {selectionMode ? (
              <CheckSquare className="w-4 h-4 me-1" />
            ) : (
              <Square className="w-4 h-4 me-1" />
            )}
            {isAr ? "تحديد" : "Select"}
          </Button>
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

      {/* شريط البحث والفلترة */}
      {data && data.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute start-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isAr ? "ابحث في الملفات..." : "Search files..."}
                  className="ps-8"
                  data-testid="input-search"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                variant={filterFavOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterFavOnly((v) => !v)}
                className="gap-1"
                data-testid="button-toggle-fav-filter"
              >
                <Star className={`w-4 h-4 ${filterFavOnly ? "fill-current" : ""}`} />
                {isAr ? "المفضلة" : "Favorites"}
                {favorites.size > 0 && (
                  <span className="ms-1 rounded-full bg-muted px-1.5 text-[10px]">
                    {favorites.size}
                  </span>
                )}
              </Button>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
                className="gap-1"
                data-testid="button-toggle-filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {isAr ? "فلترة" : "Filters"}
              </Button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
                data-testid="select-sort"
              >
                <option value="newest">{isAr ? "الأحدث" : "Newest"}</option>
                <option value="oldest">{isAr ? "الأقدم" : "Oldest"}</option>
                <option value="name">{isAr ? "الاسم" : "Name"}</option>
                <option value="rows">{isAr ? "عدد الصفوف" : "Rows"}</option>
              </select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setFilterFavOnly(false);
                    setFilterMinRows("");
                    setFilterDateFrom("");
                    setSortBy("newest");
                  }}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  {isAr ? "مسح" : "Clear"}
                </Button>
              )}
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {isAr ? "أدنى عدد صفوف" : "Min rows"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={filterMinRows}
                    onChange={(e) => setFilterMinRows(e.target.value)}
                    placeholder="0"
                    data-testid="input-min-rows"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {isAr ? "تاريخ من" : "Date from"}
                  </label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    data-testid="input-date-from"
                  />
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {isAr
                ? `يعرض ${filtered.length} من ${data.length}`
                : `Showing ${filtered.length} of ${data.length}`}
            </div>
          </CardContent>
        </Card>
      )}

      {/* شريط الإجراءات الجماعية */}
      {selectionMode && selectedIds.size > 0 && (
        <Card className="mb-4 border-primary">
          <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-medium">
              {isAr
                ? `تم تحديد ${selectedIds.size} ملف`
                : `${selectedIds.size} files selected`}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllVisible}>
                {isAr ? "تحديد الكل" : "Select all"}
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                {isAr ? "مسح" : "Clear"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1">
                    <Trash2 className="w-4 h-4" />
                    {isAr ? "حذف المحدد" : "Delete selected"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isAr ? "حذف الملفات المحددة" : "Delete selected files"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isAr
                        ? `سيتم حذف ${selectedIds.size} ملف. يمكنك التراجع خلال 6 ثوانٍ.`
                        : `${selectedIds.size} files will be deleted. You can undo within 6 seconds.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteWithUndo(Array.from(selectedIds))}
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
      )}

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
      ) : filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center text-muted-foreground text-sm">
            {isAr ? "لا توجد ملفات مطابقة للفلتر" : "No files match the filter"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const isFav = favorites.has(d.id);
            const isSelected = selectedIds.has(d.id);
            return (
              <Card
                key={d.id}
                className={`hover-elevate transition-shadow relative ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
                data-testid={`card-dataset-${d.id}`}
                onClick={(e) => {
                  if (selectionMode) {
                    // امنع التنقل عند الضغط في وضع التحديد
                    const target = e.target as HTMLElement;
                    if (target.closest("button, a, input")) return;
                    toggleSelect(d.id);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {selectionMode && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(d.id)}
                          data-testid={`checkbox-select-${d.id}`}
                          className="mt-1"
                        />
                      )}
                      <CardTitle className="text-base leading-tight flex-1 min-w-0">
                        {d.name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(d.id);
                        }}
                        className="text-muted-foreground hover:text-[hsl(45,90%,55%)] transition-colors"
                        title={
                          isFav
                            ? isAr
                              ? "إزالة من المفضلة"
                              : "Remove from favorites"
                            : isAr
                              ? "إضافة للمفضلة"
                              : "Add to favorites"
                        }
                        data-testid={`button-fav-${d.id}`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isFav ? "fill-[hsl(45,90%,55%)] text-[hsl(45,90%,55%)]" : ""
                          }`}
                        />
                      </button>
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate" data-testid={`text-filename-${d.id}`}>
                    {d.fileName}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" data-testid={`badge-rows-${d.id}`}>
                      {d.rowCount.toLocaleString(isAr ? "ar-EG" : "en-US")} {t.common.rows}
                    </Badge>
                    <Badge variant="outline">
                      {d.columns.length} {t.common.columns}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">
                    {new Date(d.createdAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        openInNewTab(d.id, d.name);
                      }}
                      data-testid={`button-open-new-${d.id}`}
                      title={isAr ? "فتح في تبويب جديد" : "Open in a new tab"}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {user && (
                      user.role === "admin" ||
                      user.id === (d.ownerId ?? (d as any).owner_id)
                    ) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareOpen({ id: d.id, name: d.name });
                        }}
                        title={isAr ? "مشاركة" : "Share"}
                        data-testid={`button-share-${d.id}`}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWithUndo([d.id]);
                      }}
                      data-testid={`button-delete-${d.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
