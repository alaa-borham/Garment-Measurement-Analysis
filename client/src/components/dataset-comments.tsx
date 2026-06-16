import { useState, useEffect, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Trash2, User as UserIcon } from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { useAuth } from "@/components/auth-gate";

interface Comment {
  id: number;
  datasetId: string;
  userId: number;
  username: string;
  body: string;
  createdAt: number;
}

interface Props {
  datasetId: string;
}

export function DatasetComments({ datasetId }: Props) {
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [datasetId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.ok) {
        setBody("");
        await load();
      }
    } catch {}
    setPosting(false);
  };

  const remove = async (id: number) => {
    if (!confirm(isAr ? "حذف التعليق؟" : "Delete comment?")) return;
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } catch {}
  };

  const fmtDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString(isAr ? "ar-SA" : "en-US");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-4 h-4" />
          {isAr ? "التعليقات" : "Comments"} ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isAr ? "أضف تعليقاً..." : "Add a comment..."}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={posting || !body.trim()} size="sm" className="gap-2">
              <Send className="w-4 h-4" />
              {posting ? (isAr ? "جارٍ..." : "Posting...") : isAr ? "إرسال" : "Post"}
            </Button>
          </div>
        </form>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {isAr ? "جارٍ التحميل..." : "Loading..."}
            </div>
          )}
          {!loading && comments.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {isAr ? "لا توجد تعليقات بعد" : "No comments yet"}
            </div>
          )}
          {comments.map((c) => {
            const canDelete = user && (user.id === c.userId || user.role === "admin");
            return (
              <div key={c.id} className="flex gap-3 p-3 rounded-md border bg-card">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">{c.username}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</span>
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
