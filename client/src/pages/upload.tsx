import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Film, X, CheckCircle2, AlertCircle, Loader2,
  CloudUpload, FileVideo
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

type UploadState = "idle" | "uploading" | "success" | "error";

const ACCEPTED_TYPES = [".mp4", ".mov", ".mkv", ".avi", ".webm"];
const MAX_SIZE_GB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_GB * 1024 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, refresh } = useAuth();
  const [, navigate] = useLocation();

  const validateFile = (f: File): string | null => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      return `Invalid file type. Accepted: ${ACCEPTED_TYPES.join(", ")}`;
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size is ${MAX_SIZE_GB}GB`;
    }
    return null;
  };

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) {
      toast({ title: "Invalid file", description: err, variant: "destructive" });
      return;
    }
    setFile(f);
    if (!title) {
      setTitle(f.name.replace(/\.[^/.]+$/, ""));
    }
    setState("idle");
    setErrorMsg("");
  }, [title, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    if (user?.plan === "free" && (user.videoCount ?? 0) >= 3) {
      toast({
        title: "Free plan limit reached",
        description: "Upgrade to Pro for unlimited uploads",
        variant: "destructive",
      });
      return;
    }

    setState("uploading");
    setUploadProgress(0);

    const simulateProgress = () => {
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 15;
        if (p >= 90) { clearInterval(interval); p = 90; }
        setUploadProgress(Math.min(p, 90));
      }, 300);
      return interval;
    };

    const interval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append("video", file);
      if (title.trim()) formData.append("title", title.trim());

      const res = await api.videos.upload(formData);
      const json = await res.json();
      clearInterval(interval);

      if (!res.ok) {
        setState("error");
        setErrorMsg(json.error || "Upload failed");
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);
      setState("success");
      await refresh();
      toast({ title: "Upload successful!", description: "AI processing has started automatically" });

      setTimeout(() => {
        navigate(`/video/${json.data.video.id}`);
      }, 1500);
    } catch (err: any) {
      clearInterval(interval);
      setState("error");
      setErrorMsg(err.message || "Upload failed");
      setUploadProgress(0);
    }
  };

  const reset = () => {
    setFile(null);
    setTitle("");
    setState("idle");
    setUploadProgress(0);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const planLimitReached = user?.plan === "free" && (user.videoCount ?? 0) >= 3;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Upload Video</h1>
        <p className="text-sm text-muted-foreground">Upload a video to generate AI-powered short clips</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-xl mx-auto space-y-5">
          {planLimitReached && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Free plan limit reached</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You've used all 3 free videos this month.{" "}
                  <Link href="/pricing" className="text-primary font-medium">Upgrade to Pro</Link>
                  {" "}for unlimited uploads.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="video-title">Video Title</Label>
            <Input
              id="video-title"
              placeholder="My awesome podcast episode..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={state === "uploading" || state === "success"}
              data-testid="input-video-title"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Video File</Label>
            <div
              className={`
                relative border-2 border-dashed rounded-lg transition-colors cursor-pointer
                ${dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"}
                ${file ? "border-primary/40" : ""}
                ${state === "uploading" || state === "success" ? "pointer-events-none opacity-60" : ""}
              `}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              data-testid="upload-dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                data-testid="input-video-file"
              />

              {!file ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <CloudUpload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Drop your video here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {ACCEPTED_TYPES.map(t => (
                      <Badge key={t} variant="outline" className="text-xs uppercase">{t.slice(1)}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Max file size: {MAX_SIZE_GB}GB</p>
                </div>
              ) : (
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileVideo className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  {state === "idle" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={e => { e.stopPropagation(); reset(); }}
                      className="flex-shrink-0"
                      data-testid="button-clear-file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {state === "uploading" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Uploading…
                </span>
                <span className="font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          {state === "success" && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">Upload complete!</p>
                <p className="text-xs text-muted-foreground">AI processing started — redirecting to your video…</p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <div>
                <p className="font-medium text-destructive">Upload failed</p>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {state !== "success" && (
              <Button
                className="flex-1 gap-2"
                onClick={handleUpload}
                disabled={!file || state === "uploading" || planLimitReached}
                data-testid="button-upload-submit"
              >
                {state === "uploading" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
                ) : (
                  <><Upload className="w-4 h-4" />Upload & Process with AI</>
                )}
              </Button>
            )}
            {(state === "error" || (state === "idle" && file)) && (
              <Button variant="ghost" onClick={reset} disabled={state === "uploading"} data-testid="button-reset">
                Reset
              </Button>
            )}
          </div>

          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">What happens next?</h3>
              <ol className="text-xs text-muted-foreground space-y-1.5">
                {[
                  "Your video is uploaded and queued for AI processing",
                  "Whisper transcribes your audio with timestamp precision",
                  "AI detects highlight moments and scores each segment",
                  "FFmpeg renders vertical 9:16 clips with subtitles",
                  "Your clips are ready for review and download",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-mono font-bold text-primary w-4 flex-shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
