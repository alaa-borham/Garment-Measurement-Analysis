import { useContext, useState } from "react";
import { Copy, Search, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { LangContext } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth, hasPermission } from "@/components/auth-gate";
import { useToast } from "@/hooks/use-toast";
import type { DuplicateOptions, DuplicatePreview } from "@shared/duplicates";

export default function DuplicatesPanel({ datasetId, datasetName, columns, permission }: {
  datasetId: number; datasetName: string; columns: string[]; permission?: string;
}) {
  const { lang } = useContext(LangContext);
  const ar = lang === "ar";
  const { user, authEnabled } = useAuth();
  const { toast } = useToast();
  const canRemove = !authEnabled || (hasPermission(user, "edit_rows") &&
    (user?.role === "admin" || permission === "edit" || permission === "delete"));
  const [options, setOptions] = useState<DuplicateOptions>({ match: "all", columns: [], keep: "first" });
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<DuplicatePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<{ key?: string; count: number } | null>(null);
  const number = (n: number) => n.toLocaleString(ar ? "ar-EG" : "en-US");

  const change = (patch: Partial<DuplicateOptions>) => {
    setOptions(prev => ({ ...prev, ...patch }));
    setResult(null);
    setTarget(null);
    setError("");
  };
  const scan = async (page = 1) => {
    setBusy(true); setError("");
    try {
      const response = await apiRequest("POST", `/api/datasets/${datasetId}/duplicates/preview`, { ...options, page });
      setResult(await response.json());
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : (ar ? "تعذر الفحص" : "Scan failed"));
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!result || !target || !canRemove || deleting) return;
    setDeleting(true); setError("");
    try {
      const response = await apiRequest("POST", `/api/datasets/${datasetId}/duplicates/delete`, {
        ...options, revision: result.revision, groupKey: target.key, confirmed: true,
      });
      const data = await response.json();
      setTarget(null);
      setResult(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dataset-rows"] }),
        queryClient.invalidateQueries({ queryKey: ["dataset-pinned-rows"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/datasets"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/datasets/${datasetId}/versions`] }),
      ]);
      toast({ title: ar ? `حُذفت ${number(data.deleted)} نسخة زائدة` : `Removed ${data.deleted} extra copies`,
        description: ar ? "تم حفظ إصدار احتياطي قبل الحذف ضمن إصدارات الملف." : "A backup snapshot was saved in Dataset versions." });
      await scan(1);
    } catch (e) {
      setTarget(null);
      setResult(null);
      setError(e instanceof Error ? e.message : (ar ? "تعذر الحذف، أعد الفحص" : "Deletion failed; rescan"));
    } finally { setDeleting(false); }
  };
  return (
    <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
      <Card><CardContent className="p-4 space-y-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2"><Copy className="w-4 h-4" />{ar ? "التكرار والتطابق" : "Duplicates & exact matches"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {ar ? "الفحص يشمل الملف كاملاً، وليس الصفحة الحالية أو نتائج الفلتر. لا يتم الحذف إلا بعد المعاينة والتأكيد." : "Scans the entire file, not the current page or filter. Nothing is deleted until you preview and confirm."}
          </p>
        </div>
        <fieldset disabled={busy || deleting} className="flex flex-wrap items-end gap-3 min-w-0">
          <label className="space-y-1 text-sm">
            <span className="block">{ar ? "طريقة المطابقة" : "Match mode"}</span>
            <select data-testid="duplicates-mode" value={options.match} onChange={e => change({ match: e.target.value as DuplicateOptions["match"] })}
              className="h-9 rounded-md border bg-background px-3 max-w-full">
              <option value="all">{ar ? "تطابق تام: كل بيانات الصف" : "Exact: all row data"}</option>
              <option value="columns">{ar ? "تطابق في أعمدة محددة" : "Match selected columns"}</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block">{ar ? "النسخة التي ستبقى" : "Copy to keep"}</span>
            <select data-testid="duplicates-keep" value={options.keep} onChange={e => change({ keep: e.target.value as DuplicateOptions["keep"] })}
              className="h-9 rounded-md border bg-background px-3">
              <option value="first">{ar ? "أول صف بحسب ترتيب الملف" : "First row in file order"}</option>
              <option value="last">{ar ? "آخر صف بحسب ترتيب الملف" : "Last row in file order"}</option>
            </select>
          </label>
          <Button data-testid="duplicates-scan" onClick={() => scan()} disabled={busy || deleting || (options.match === "columns" && !options.columns.length)}>
            {busy ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Search className="w-4 h-4 me-2" />}
            {ar ? "فحص التكرار" : "Scan duplicates"}
          </Button>
        </fieldset>
        {options.match === "columns" && (
          <fieldset disabled={busy || deleting} className="border rounded-md p-3 space-y-2 min-w-0">
            <Input aria-label={ar ? "بحث في الأعمدة" : "Search columns"} placeholder={ar ? "بحث في الأعمدة..." : "Search columns..."} value={search} onChange={e => setSearch(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => change({ columns: [...columns] })}>{ar ? "تحديد الكل" : "Select all"}</Button>
              <Button size="sm" variant="ghost" onClick={() => change({ columns: [] })}>{ar ? "إلغاء الكل" : "Clear"}</Button>
              <span className="text-xs self-center text-muted-foreground">{number(options.columns.length)} {ar ? "عمود محدد" : "selected"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-48 overflow-auto">
              {columns.filter(c => c.toLowerCase().includes(search.toLowerCase())).map(c => (
                <label key={c} className="flex items-center gap-2 text-sm break-all p-1">
                  <input type="checkbox" aria-label={c} checked={options.columns.includes(c)} onChange={e => {
                    const checked = e.currentTarget.checked;
                    change({ columns: checked ? [...options.columns, c] : options.columns.filter(v => v !== c) });
                  }} />{c}
                </label>
              ))}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">{ar ? "تنبيه: قد تختلف بقية أعمدة الصفوف. الحذف سيعتمد على الأعمدة المحددة فقط." : "Other columns may differ. Deletion will use only the selected columns."}</p>
          </fieldset>
        )}
        <p className="text-xs text-muted-foreground">{ar ? "المطابقة دقيقة: لا يتم تجاهل المسافات أو اختلاف حالة الأحرف أو نوع القيمة." : "Matching is strict: whitespace, letter case and value types are preserved."}</p>
        {!canRemove && <p className="text-sm text-muted-foreground">{ar ? "يمكنك معاينة التكرار. حذف النسخ يتطلب صلاحية تعديل الصفوف وصلاحية تعديل هذا الملف." : "Preview only. Removing copies requires row-editing and edit access to this file."}</p>}
        {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
      </CardContent></Card>
      {result && (
        <>
          <Card><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3 text-sm" aria-live="polite">
              <span>{ar ? "إجمالي الصفوف:" : "Total rows:"} {number(result.totalRows)}</span>
              <span>{ar ? "مجموعات متطابقة:" : "Duplicate groups:"} <b data-testid="duplicates-groups">{number(result.groupCount)}</b></span>
              <span>{ar ? "نسخ زائدة:" : "Extra copies:"} <b data-testid="duplicates-extra">{number(result.extraRows)}</b></span>
            </div>
            {canRemove && result.extraRows > 0 && <Button variant="destructive" data-testid="duplicates-delete-all"
              disabled={busy || deleting} onClick={() => setTarget({ count: result.extraRows })}>
              <Trash2 className="w-4 h-4 me-2" />{ar ? "حذف كل النسخ الزائدة" : "Remove all extra copies"}
            </Button>}
          </CardContent></Card>
          {result.groupCount === 0 && <p className="text-center border rounded-md py-8 text-muted-foreground" data-testid="duplicates-empty">{ar ? "لا توجد صفوف مكررة وفق طريقة المطابقة المختارة." : "No duplicate rows for this match mode."}</p>}
          {result.groups.map((g, index) => (
            <Card key={g.key}><CardContent className="p-0">
              <div className="p-3 flex flex-wrap justify-between items-center gap-2 border-b">
                <div className="flex items-center gap-2 text-sm">
                  <b>{ar ? "مجموعة" : "Group"} {number((result.page - 1) * 10 + index + 1)}</b>
                  <Badge variant="secondary">{number(g.count)} {ar ? "نسخ" : "copies"}</Badge>
                  <span className="text-muted-foreground">{ar ? "سيبقى الصف" : "Keep row"} #{g.keepId}</span>
                </div>
                {canRemove && <Button size="sm" variant="outline" data-testid={`duplicates-delete-group-${index}`}
                  disabled={busy || deleting} onClick={() => setTarget({ key: g.key, count: g.count - 1 })}>
                  {ar ? "حذف الزائد من هذه المجموعة" : "Remove this group's extras"}
                </Button>}
              </div>
              <div className="overflow-auto max-h-72">
                <table className="w-full text-sm border-collapse">
                  <thead><tr className="bg-muted/70"><th className="p-2 whitespace-nowrap">{ar ? "معرف الصف" : "Row ID"}</th><th className="p-2">{ar ? "الإجراء" : "Action"}</th>
                    {columns.map(c => <th key={c} className="p-2 border-s whitespace-nowrap min-w-[110px]">{c}</th>)}
                  </tr></thead>
                  <tbody>{g.rows.map(r => <tr key={r.id} className="border-t">
                    <td className="p-2 text-center">#{r.id}</td>
                    <td className="p-2 whitespace-nowrap">{r.id === g.keepId
                      ? <Badge variant="secondary"><ShieldCheck className="w-3 h-3 me-1" />{ar ? "احتفاظ" : "Keep"}</Badge>
                      : <span className="text-muted-foreground">{ar ? "نسخة زائدة" : "Extra copy"}</span>}</td>
                    {columns.map(c => <td key={c} className="p-2 border-s whitespace-nowrap text-center max-w-xs truncate" title={String(r.data[c] ?? "")}>{String(r.data[c] ?? "")}</td>)}
                  </tr>)}</tbody>
                </table>
              </div>
              {g.count > g.rows.length && <p className="px-3 py-2 text-xs text-muted-foreground">{ar ? `معاينة ${number(g.rows.length)} من ${number(g.count)} صف. الحذف يشمل كل نسخ المجموعة ما عدا النسخة المحددة للاحتفاظ.` : `Showing ${g.rows.length} of ${g.count} rows. Removal covers all copies except the retained row.`}</p>}
            </CardContent></Card>
          ))}
          {result.totalPages > 1 && <div className="flex items-center justify-center gap-3">
            <Button variant="outline" disabled={busy || deleting || result.page === 1} onClick={() => scan(result.page - 1)}>{ar ? "السابق" : "Previous"}</Button>
            <span className="text-sm">{number(result.page)} / {number(result.totalPages)}</span>
            <Button variant="outline" disabled={busy || deleting || result.page === result.totalPages} onClick={() => scan(result.page + 1)}>{ar ? "التالي" : "Next"}</Button>
          </div>}
        </>
      )}
      <AlertDialog open={!!target} onOpenChange={open => { if (!open && !deleting) setTarget(null); }}>
        <AlertDialogContent dir={ar ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "تأكيد حذف النسخ الزائدة" : "Confirm duplicate removal"}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2" asChild><div className="text-sm text-muted-foreground">
              <p>{ar ? `سيتم حذف ${number(target?.count || 0)} صف من «${datasetName}» والاحتفاظ بنسخة واحدة في كل مجموعة مستهدفة.` : `Delete ${target?.count || 0} rows from “${datasetName}”, retaining one per targeted group.`}</p>
              <p>{options.keep === "first" ? (ar ? "سيتم الاحتفاظ بأول نسخة." : "The first copy will be kept.") : (ar ? "سيتم الاحتفاظ بآخر نسخة." : "The last copy will be kept.")}</p>
              {options.match === "columns" && <p className="text-amber-700 dark:text-amber-400 break-words">{ar ? "المطابقة على الأعمدة التالية فقط، وقد تختلف بقية البيانات: " : "Only these columns are matched; other values may differ: "}{options.columns.join("، ")}</p>}
              <p>{ar ? "سيُحفظ إصدار احتياطي كامل تلقائياً قبل الحذف. لا تُنفّذ العملية إذا تغيّرت البيانات بعد الفحص." : "A complete snapshot is saved before deletion. Changed data requires a new scan."}</p>
            </div></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <Button variant="destructive" data-testid="duplicates-confirm" onClick={remove} disabled={deleting || !canRemove}>
              {deleting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}{ar ? "تأكيد الحذف" : "Confirm deletion"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
