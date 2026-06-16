import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  FileSpreadsheet,
  Upload,
  GitCompare,
  LayoutGrid,
  Tag,
  Users,
  ScrollText,
  Database,
  UsersRound,
  Home,
  X,
  ArrowRight,
} from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { useAuth } from "@/components/auth-gate";

interface DatasetItem {
  id: number;
  name: string;
  fileName: string;
  rowCount: number;
}

interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon: any;
  action: () => void;
  keywords?: string;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const can = (f: string) => {
    if (!user) return true;
    if (user.role === "admin") return true;
    return user.permissions?.[f] !== false;
  };

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: datasets } = useQuery<DatasetItem[]>({
    queryKey: ["/api/datasets"],
    enabled: open,
  });

  const L = {
    placeholder: isAr ? "ابحث أو نفّذ أمراً..." : "Search or run a command...",
    navigation: isAr ? "التنقل" : "Navigation",
    files: isAr ? "الملفات" : "Files",
    actions: isAr ? "إجراءات" : "Actions",
    noResults: isAr ? "لا توجد نتائج" : "No results",
    home: isAr ? "الرئيسية" : "Home",
    allFiles: isAr ? "كل الملفات" : "All files",
    upload: isAr ? "رفع ملف جديد" : "Upload file",
    compare: isAr ? "مقارنة بين ملفات" : "Compare files",
    templates: isAr ? "القوالب" : "Templates",
    multiAnalysis: isAr ? "تحليل متعدد" : "Multi-analysis",
    adminUsers: isAr ? "إدارة المستخدمين" : "Manage users",
    adminGroups: isAr ? "المجموعات" : "Groups",
    adminBackup: isAr ? "النسخ الاحتياطي" : "Backup",
    adminAudit: isAr ? "سجل العمليات" : "Audit log",
    open: isAr ? "فتح" : "Open",
  };

  // اقفل عند escape، أعد activeIndex عند الفتح
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const go = (path: string) => {
    setLocation(path);
    onOpenChange(false);
  };

  // ابني قائمة الأوامر
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // Navigation
    list.push({
      id: "nav-home",
      label: L.home,
      group: L.navigation,
      icon: Home,
      action: () => go("/"),
      keywords: "dashboard home رئيسية",
    });
    list.push({
      id: "nav-files",
      label: L.allFiles,
      group: L.navigation,
      icon: Database,
      action: () => go("/datasets"),
      keywords: "files datasets ملفات",
    });
    if (can("upload")) {
      list.push({
        id: "act-upload",
        label: L.upload,
        group: L.actions,
        icon: Upload,
        action: () => go("/upload"),
        keywords: "upload رفع جديد",
      });
    }
    if (can("compare_files")) {
      list.push({
        id: "act-compare",
        label: L.compare,
        group: L.actions,
        icon: GitCompare,
        action: () => go("/compare"),
        keywords: "compare diff مقارنة",
      });
    }
    if (can("templates")) {
      list.push({
        id: "act-templates",
        label: L.templates,
        group: L.actions,
        icon: Tag,
        action: () => go("/templates"),
        keywords: "templates قوالب",
      });
    }
    if (can("multi_analysis")) {
      list.push({
        id: "act-multi",
        label: L.multiAnalysis,
        group: L.actions,
        icon: LayoutGrid,
        action: () => go("/multi-analysis"),
        keywords: "multi analysis تحليل متعدد",
      });
    }
    if (isAdmin) {
      list.push({
        id: "admin-users",
        label: L.adminUsers,
        group: L.actions,
        icon: Users,
        action: () => go("/admin/users"),
        keywords: "admin users مستخدمين",
      });
      list.push({
        id: "admin-groups",
        label: L.adminGroups,
        group: L.actions,
        icon: UsersRound,
        action: () => go("/admin/groups"),
        keywords: "groups مجموعات",
      });
      list.push({
        id: "admin-audit",
        label: L.adminAudit,
        group: L.actions,
        icon: ScrollText,
        action: () => go("/admin/audit"),
        keywords: "audit log سجل",
      });
    }

    // Files
    (datasets ?? []).forEach((d) => {
      list.push({
        id: `ds-${d.id}`,
        label: d.name,
        group: L.files,
        icon: FileSpreadsheet,
        action: () => go(`/datasets/${d.id}`),
        keywords: `${d.fileName} ${d.rowCount}`,
      });
    });

    return list;
  }, [datasets, isAdmin, user, isAr]);

  // فلترة
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        (c.keywords && c.keywords.toLowerCase().includes(q))
    );
  }, [commands, query]);

  // مجمّعة حسب group
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, [filtered]);

  // تنقل بالكيبورد
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) item.action();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, filtered, activeIndex, onOpenChange]);

  useEffect(() => setActiveIndex(0), [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      data-testid="command-palette"
    >
      <div
        className="bg-background border rounded-lg shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L.placeholder}
            className="flex-1 h-12 bg-transparent outline-none text-sm"
            data-testid="cmd-input"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {L.noResults}
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-semibold">
                  {group}
                </div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const globalIndex = filtered.indexOf(item);
                  const active = globalIndex === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded text-start text-sm transition-colors ${
                        active ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                      }`}
                      data-testid={`cmd-item-${item.id}`}
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="border-t px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 rounded bg-background border">↑↓</kbd> {isAr ? "تنقل" : "navigate"}</span>
            <span><kbd className="px-1 rounded bg-background border">↵</kbd> {isAr ? "اختيار" : "select"}</span>
            <span><kbd className="px-1 rounded bg-background border">Esc</kbd> {isAr ? "إغلاق" : "close"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
