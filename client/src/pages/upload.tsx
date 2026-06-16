import { useContext, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import { LangContext } from "@/lib/i18n";
import { queryClient, API_BASE } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

export default function UploadPage() {
  const { t } = useContext(LangContext);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const isBusy = state === "uploading" || state === "processing";

  const removeFile = () => {
    if (xhrRef.current && state === "uploading") {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setFile(null);
    setProgress(0);
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!name.trim()) {
      toast({ title: t.upload.nameRequired, variant: "destructive" });
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name.trim());

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `${API_BASE}/api/datasets/upload`);

    // Attach auth token (used in local desktop build where LOCAL_AUTH=1)
    try {
      const token = localStorage.getItem("qiyasat_auth_token");
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    } catch {}

    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setProgress(pct);
        if (pct === 100) setState("processing");
      }
    });

    xhr.addEventListener("load", () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          setState("done");
          setProgress(100);
          queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
          toast({
            title: t.upload.success,
            description: t.upload.successDesc.replace(
              "{n}",
              String(data.rowCount ?? 0)
            ),
          });
          setTimeout(() => setLocation(`/datasets/${data.id}`), 600);
        } catch {
          setState("error");
          toast({ title: t.upload.failed, variant: "destructive" });
        }
      } else {
        setState("error");
        let msg = `HTTP ${xhr.status}`;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err?.error) msg = err.error;
        } catch {}
        toast({ title: t.upload.failed, description: msg, variant: "destructive" });
      }
    });

    xhr.addEventListener("error", () => {
      xhrRef.current = null;
      setState("error");
      toast({ title: t.upload.failed, variant: "destructive" });
    });

    xhr.addEventListener("abort", () => {
      xhrRef.current = null;
    });

    setState("uploading");
    setProgress(0);
    xhr.send(fd);
  };

  const progressLabel = () => {
    if (state === "uploading")
      return `${t.upload.uploadingProgress} · ${progress}%`;
    if (state === "processing") return t.upload.processing;
    if (state === "done") return t.upload.uploaded;
    return "";
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-2" data-testid="text-page-title">
        {t.upload.title}
      </h1>
      <p className="text-muted-foreground text-sm mb-6">{t.upload.desc}</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.upload.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isBusy ? "cursor-default" : "cursor-pointer hover-elevate"
              } ${dragOver ? "border-primary bg-accent" : "border-border"}`}
              onClick={() => {
                if (!isBusy && !file) inputRef.current?.click();
              }}
              onDragOver={(e) => {
                if (isBusy) return;
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                if (isBusy) return;
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) {
                  setFile(f);
                  setState("idle");
                  setProgress(0);
                }
              }}
              data-testid="dropzone-upload"
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setState("idle");
                  setProgress(0);
                }}
                data-testid="input-file"
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  {state === "done" ? (
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  ) : (
                    <FileSpreadsheet className="w-10 h-10 text-primary" />
                  )}
                  <div className="font-medium text-sm" data-testid="text-filename">
                    {file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.upload.fileSize}:{" "}
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>

                  {state !== "idle" && state !== "error" && (
                    <div className="w-full max-w-md mt-3 space-y-1.5">
                      <Progress
                        value={state === "processing" ? 100 : progress}
                        className={
                          state === "processing" ? "animate-pulse" : ""
                        }
                      />
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        {state !== "done" && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        <span>{progressLabel()}</span>
                      </div>
                    </div>
                  )}

                  {state !== "uploading" && state !== "processing" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="mt-2 text-muted-foreground hover:text-destructive"
                      data-testid="button-remove-file"
                    >
                      <X className="w-4 h-4 me-1" />
                      {t.upload.remove}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <UploadCloud className="w-10 h-10" />
                  <div className="text-sm">{t.upload.dragHere}</div>
                  <div className="text-xs">.xlsx · .xls · .csv</div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="dsname" className="flex items-center justify-between">
                <span>{t.upload.datasetName}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {t.upload.datasetNameHint}
                </span>
              </Label>
              <Input
                id="dsname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2"
                placeholder={t.upload.datasetNamePlaceholder}
                disabled={isBusy}
                required
                data-testid="input-name"
              />
            </div>

            <Button
              type="submit"
              disabled={!file || !name.trim() || isBusy || state === "done"}
              className="w-full"
              data-testid="button-submit-upload"
            >
              {state === "uploading" ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t.upload.uploadingProgress} · {progress}%
                </>
              ) : state === "processing" ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t.upload.processing}
                </>
              ) : state === "done" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 me-2" />
                  {t.upload.uploaded}
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 me-2" />
                  {t.upload.submit}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
