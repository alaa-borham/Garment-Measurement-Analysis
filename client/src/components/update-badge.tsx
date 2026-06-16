// UpdateBadge — shows "تحديث متوفر" button when the Electron desktop
// updater reports a newer version. Hidden on the web (no ?updater= param).

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Status = {
  current: string;
  latest: string | null;
  url: string | null;
  notes: string | null;
  available: boolean;
  checking: boolean;
  downloading: boolean;
  progress: number;
  error: string | null;
  lastChecked: string | null;
  offline: boolean;
};

function getUpdaterBase(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("updater");
    if (!p) return null;
    return `http://127.0.0.1:${p}`;
  } catch {
    return null;
  }
}

export function UpdateBadge() {
  const base = getUpdaterBase();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!base) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`${base}/update/status`);
        if (!r.ok) return;
        const data = (await r.json()) as Status;
        if (!cancelled) setStatus(data);
      } catch {
        // ignore — offline or main process not ready yet
      }
    };
    tick();
    const id = window.setInterval(tick, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [base]);

  if (!base || !status || !status.available) return null;

  const handleUpdate = async () => {
    if (busy) return;
    setBusy(true);
    toast({
      title: "بدء التحديث",
      description: `جاري تنزيل الإصدار ${status.latest}...`,
    });
    try {
      const r = await fetch(`${base}/update/start`, { method: "POST" });
      const data = await r.json();
      if (!data.ok) {
        toast({
          title: "فشل التحديث",
          description: data.error || "حدث خطأ غير معروف",
          variant: "destructive",
        });
        setBusy(false);
      }
      // On success, the app will quit and restart automatically
    } catch (e: any) {
      toast({
        title: "فشل التحديث",
        description: String(e?.message || e),
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  const downloading = status.downloading || busy;

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleUpdate}
      disabled={downloading}
      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
      data-testid="button-update"
      title={status.notes || ""}
    >
      {downloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {status.progress > 0 ? `${status.progress}%` : "جاري التنزيل..."}
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          تحديث متوفر ({status.latest})
        </>
      )}
    </Button>
  );
}
