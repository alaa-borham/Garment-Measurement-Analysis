import { useContext, useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Users, Plus, Trash2, UserPlus, ShieldAlert } from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { useAuth } from "@/components/auth-gate";

interface Group {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
  created_at: number;
}

interface MemberUser {
  id: number;
  username: string;
  role: string;
  is_member: number;
}

export default function AdminGroupsPage() {
  const { user } = useAuth();
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [error, setError] = useState("");
  const [membersDialog, setMembersDialog] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberUser[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/groups");
      if (r.ok) {
        const d = await r.json();
        setGroups(d.groups || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError("");
    if (!newName.trim()) {
      setError(isAr ? "اسم المجموعة مطلوب" : "Group name required");
      return;
    }
    const r = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error || "Error");
      return;
    }
    setNewName("");
    setNewDesc("");
    setCreateOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm(isAr ? "هل تريد حذف المجموعة؟" : "Delete group?")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    load();
  };

  const openMembers = async (g: Group) => {
    setMembersDialog(g);
    const r = await fetch(`/api/groups/${g.id}/members`);
    if (r.ok) {
      const d = await r.json();
      setMembers(d.users || []);
    }
  };

  const toggleMember = (uid: number) => {
    setMembers((prev) => prev.map((u) => (u.id === uid ? { ...u, is_member: u.is_member ? 0 : 1 } : u)));
  };

  const saveMembers = async () => {
    if (!membersDialog) return;
    const userIds = members.filter((u) => u.is_member).map((u) => u.id);
    await fetch(`/api/groups/${membersDialog.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds }),
    });
    setMembersDialog(null);
    load();
  };

  if (user && user.role !== "admin") {
    return (
      <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{isAr ? "غير مصرح" : "Forbidden"}</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{isAr ? "إدارة المجموعات" : "Groups Management"}</h1>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 me-2" />
                {isAr ? "مجموعة جديدة" : "New group"}
              </Button>
            </DialogTrigger>
            <DialogContent dir={isAr ? "rtl" : "ltr"}>
              <DialogHeader>
                <DialogTitle>{isAr ? "إنشاء مجموعة" : "Create group"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{isAr ? "اسم المجموعة" : "Name"}</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "الوصف (اختياري)" : "Description (optional)"}</Label>
                  <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button onClick={create}>{isAr ? "إنشاء" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isAr ? `المجموعات (${groups.length})` : `Groups (${groups.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">{isAr ? "جارٍ التحميل..." : "Loading..."}</div>
            ) : groups.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {isAr ? "لا توجد مجموعات بعد. أنشئ مجموعة جديدة." : "No groups yet."}
              </div>
            ) : (
              <div className="divide-y">
                {groups.map((g) => (
                  <div key={g.id} className="p-4 flex items-center justify-between gap-3 hover:bg-accent/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{g.name}</div>
                        {g.description && <div className="text-sm text-muted-foreground truncate">{g.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">
                        {g.member_count} {isAr ? "عضو" : "members"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => openMembers(g)}>
                        <UserPlus className="w-4 h-4 me-1" />
                        {isAr ? "الأعضاء" : "Members"}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(g.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!membersDialog} onOpenChange={(o) => !o && setMembersDialog(null)}>
          <DialogContent dir={isAr ? "rtl" : "ltr"} className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {isAr ? `أعضاء "${membersDialog?.name}"` : `Members of "${membersDialog?.name}"`}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {members.map((u) => (
                <label key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer">
                  <input
                    type="checkbox"
                    checked={u.is_member === 1}
                    onChange={() => toggleMember(u.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{u.username}</div>
                    <div className="text-xs text-muted-foreground">{u.role}</div>
                  </div>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMembersDialog(null)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={saveMembers}>{isAr ? "حفظ" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
