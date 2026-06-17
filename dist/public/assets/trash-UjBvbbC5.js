import { c as createLucideIcon, r as reactExports, L as LangContext, a2 as useQueryClient, h as useToast, a3 as useQuery, a4 as useMutation, j as jsxRuntimeExports, T as Trash2, C as Card, a as CardContent, a0 as FileText, B as Button, a5 as TriangleAlert, a6 as apiRequest } from "./index-klzEDF9_.js";
const ArchiveRestore = createLucideIcon("ArchiveRestore", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h2", key: "tvwodi" }],
  ["path", { d: "M20 8v11a2 2 0 0 1-2 2h-2", key: "1gkqxj" }],
  ["path", { d: "m9 15 3-3 3 3", key: "1pd0qc" }],
  ["path", { d: "M12 12v9", key: "192myk" }]
]);
function TrashPage() {
  const { lang } = reactExports.useContext(LangContext);
  const isAr = lang === "ar";
  const qc = useQueryClient();
  const { toast } = useToast();
  const L = {
    title: isAr ? "سلّة المحذوفات" : "Trash",
    empty: isAr ? "السلّة فارغة" : "Trash is empty",
    restore: isAr ? "استعادة" : "Restore",
    purge: isAr ? "حذف نهائي" : "Delete permanently",
    rows: isAr ? "صف" : "rows",
    deletedAt: isAr ? "حُذف في" : "Deleted at",
    confirmPurge: isAr ? "حذف نهائي ولا يمكن التراجع. متأكد؟" : "Permanent delete. Are you sure?",
    restored: isAr ? "تم الاستعادة ✓" : "Restored ✓",
    purged: isAr ? "تم الحذف نهائياً" : "Permanently deleted"
  };
  const { data, isLoading } = useQuery({
    queryKey: ["trash"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/datasets/trash/list");
      return res.json();
    }
  });
  const restoreMut = useMutation({
    mutationFn: async (id) => {
      await apiRequest("POST", `/api/datasets/${id}/restore`);
    },
    onSuccess: () => {
      toast({ description: L.restored, duration: 1800 });
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["/api/datasets"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    }
  });
  const purgeMut = useMutation({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/datasets/${id}/purge`);
    },
    onSuccess: () => {
      toast({ description: L.purged, duration: 1800 });
      qc.invalidateQueries({ queryKey: ["trash"] });
    }
  });
  const items = data?.items || [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-5 h-5 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold", children: L.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
        "(",
        items.length,
        ")"
      ] })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "..." }) : items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-8 text-center text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-10 h-10 mx-auto mb-2 opacity-40" }),
      L.empty
    ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2", children: items.map((it) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-5 h-5 text-muted-foreground shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold text-sm truncate", children: it.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            it.rowCount.toLocaleString(),
            " ",
            L.rows
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "·" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            L.deletedAt,
            ": ",
            new Date(it.deletedAt).toLocaleString(isAr ? "ar-SA" : "en-US")
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: () => restoreMut.mutate(it.id),
            disabled: restoreMut.isPending,
            className: "h-8 text-xs gap-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArchiveRestore, { className: "w-3.5 h-3.5" }),
              L.restore
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "destructive",
            size: "sm",
            onClick: () => {
              if (confirm(L.confirmPurge)) purgeMut.mutate(it.id);
            },
            disabled: purgeMut.isPending,
            className: "h-8 text-xs gap-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-3.5 h-3.5" }),
              L.purge
            ]
          }
        )
      ] })
    ] }) }, it.id)) })
  ] });
}
export {
  TrashPage as default
};
//# sourceMappingURL=trash-UjBvbbC5.js.map
