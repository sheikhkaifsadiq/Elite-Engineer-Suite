import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipCard } from "@/components/clip-card";
import {
  ArrowLeft, Film, RefreshCw, Play, CheckCircle2, AlertCircle,
  Loader2, Clock, Scissors, FileText, Zap, Trash2, HardDrive,
  Calendar, BarChart3, Info
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import type { Clip, ConnectedAccount } from "@shared/schema";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExportDialog } from "@/components/export-dialog";
import { ClipEditorDialog } from "@/components/clip-editor-dialog";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";

async function fetchVideoDetail(id: string) {
  const res = await api.videos.get(id);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Video not found");
  return json.data;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge variant="default" className="gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Completed</Badge>;
  if (status === "processing") return <Badge variant="secondary" className="gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="gap-1.5"><AlertCircle className="w-3.5 h-3.5" />Failed</Badge>;
  return <Badge variant="outline" className="gap-1.5"><Clock className="w-3.5 h-3.5" />Pending</Badge>;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [deleteClipId, setDeleteClipId] = useState<string | null>(null);
  const [showDeleteVideo, setShowDeleteVideo] = useState(false);
  const [exportClip, setExportClip] = useState<Clip | null>(null);
  const [editClip, setEditClip] = useState<Clip | null>(null);
  const [thumbError, setThumbError] = useState(false);

  const { data: connectedAccounts = [] } = useQuery({
    queryKey: ["/api/v1/accounts/connected"],
    queryFn: async () => {
      const res = await api.accounts.list();
      const json = await res.json();
      return json.data as ConnectedAccount[];
    },
  });

  const { data: video, isLoading, refetch } = useQuery({
    queryKey: ["/api/v1/videos", id],
    queryFn: () => fetchVideoDetail(id),
    staleTime: 0,
    refetchOnMount: "always" as const,
    refetchInterval: (query: any) => {
      const d = query?.state?.data;
      if (!d) return 3000;
      const status = d.job?.status;
      return status === "pending" || status === "processing" ? 3000 : false;
    },
  });

  const processMutation = useMutation({
    mutationFn: () => api.videos.process(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/videos", id] });
      toast({ title: "Processing started", description: "Your video is being analyzed by AI" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to start processing", description: err.message, variant: "destructive" });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: () => api.videos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/videos/list"] });
      queryClient.removeQueries({ queryKey: ["/api/v1/videos", id] });
      toast({ title: "Video deleted" });
      navigate("/dashboard");
    },
    onError: () => {
      toast({ title: "Failed to delete video", variant: "destructive" });
    },
  });

  const deleteClipMutation = useMutation({
    mutationFn: (clipId: string) => api.clips.delete(clipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/videos", id] });
      toast({ title: "Clip deleted" });
      setDeleteClipId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete clip", variant: "destructive" });
    },
  });

  const handleClipUpdate = (updated: Clip) => {
    queryClient.setQueryData(["/api/v1/videos", id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        clips: old.clips.map((c: Clip) => c.id === updated.id ? updated : c),
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="aspect-video rounded-xl lg:col-span-2" />
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Film className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg mb-1">Video not found</p>
          <p className="text-sm text-muted-foreground">This video may have been deleted</p>
        </div>
        <Button variant="outline" className="gap-2 mt-2" onClick={() => navigate("/dashboard")} data-testid="button-back-dashboard">
          <ArrowLeft className="w-4 h-4" />Back to Dashboard
        </Button>
      </div>
    );
  }

  const job = video.job;
  const clips: Clip[] = video.clips || [];
  const status = job?.status || video.status;
  const progress = job?.progress || 0;
  const showThumbnail = video.hasThumbnail && !thumbError;
  const avgVirality = clips.length > 0 ? Math.round(clips.reduce((a: number, c: Clip) => a + c.viralityScore, 0) / clips.length) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-3 flex items-center justify-between gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 h-8 w-8"
            onClick={() => navigate("/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm leading-tight truncate" data-testid="text-video-title">{video.title}</h1>
            <p className="text-xs text-muted-foreground truncate">{video.originalFilename}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={status} />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setShowDeleteVideo(true)}
            data-testid="button-delete-video"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted border border-border shadow-sm">
                {showThumbnail ? (
                  <img
                    src={`/api/v1/videos/${video.id}/thumbnail`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={() => setThumbError(true)}
                    data-testid="img-video-preview"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-muted to-primary/5 flex flex-col items-center justify-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-background/80 flex items-center justify-center shadow-lg">
                      <Film className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {status === "pending" ? "Waiting to process" : status === "processing" ? "Processing video…" : "No preview available"}
                    </span>
                  </div>
                )}

                {status === "processing" && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <div className="text-center">
                      <p className="text-white font-medium text-sm">{job?.currentStep || "Processing…"}</p>
                      <p className="text-white/70 text-xs mt-0.5">{Math.round(progress)}% complete</p>
                    </div>
                    <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {(status === "failed" || (!job && status === "pending")) && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {status === "failed" ? <AlertCircle className="w-5 h-5 text-destructive" /> : <Play className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{status === "failed" ? "Processing failed" : "Ready to process"}</p>
                    <p className="text-xs text-muted-foreground">
                      {status === "failed" ? "Something went wrong. Try reprocessing." : "Click to start AI analysis and clip generation"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => processMutation.mutate()}
                    disabled={processMutation.isPending}
                    className="gap-1.5 flex-shrink-0"
                    data-testid="button-process"
                  >
                    {processMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    {status === "failed" ? "Retry" : "Process"}
                  </Button>
                </div>
              )}

              {status === "failed" && job?.errorLog && (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Error Details</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">{job.errorLog}</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-3">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Video Info</span>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { icon: HardDrive, label: "File Size", value: formatFileSize(video.fileSize) },
                    { icon: Clock, label: "Duration", value: formatDuration(video.duration) },
                    { icon: Calendar, label: "Uploaded", value: video.createdAt ? format(new Date(video.createdAt), "MMM d, yyyy 'at' h:mm a") : "—" },
                    { icon: Scissors, label: "Clips Generated", value: clips.length.toString() },
                    ...(avgVirality !== null ? [{ icon: BarChart3, label: "Avg Virality", value: `${avgVirality}/100` }] : []),
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {status === "processing" && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm font-medium text-primary">Processing</span>
                  </div>
                  {job?.currentStep && (
                    <p className="text-xs text-muted-foreground">{job.currentStep}</p>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" data-testid="progress-bar" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm" data-testid="text-clips-heading">AI-Generated Clips</h2>
                  <p className="text-xs text-muted-foreground">{clips.length} clip{clips.length !== 1 ? "s" : ""} generated</p>
                </div>
              </div>
              {clips.length > 0 && (
                <Badge variant="outline" className="text-[11px]">
                  Sorted by virality
                </Badge>
              )}
            </div>

            {status !== "completed" && clips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border bg-muted/20">
                {status === "processing" ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Loader2 className="w-7 h-7 text-primary animate-spin" />
                    </div>
                    <p className="font-medium mb-1">Generating clips…</p>
                    <p className="text-sm text-muted-foreground max-w-xs">AI is analyzing your video and detecting the best highlight moments</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Scissors className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <p className="font-medium mb-1">{status === "pending" ? "Processing will start shortly" : "No clips yet"}</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      {status === "pending" ? "Your video is queued for processing" : "Start processing to generate AI clips"}
                    </p>
                  </>
                )}
              </div>
            ) : clips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border bg-muted/20">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Scissors className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="font-medium mb-1">No clips generated</p>
                <p className="text-sm text-muted-foreground">Reprocess the video to generate clips</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clips.map(clip => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    onDelete={(clipId) => setDeleteClipId(clipId)}
                    onUpdate={handleClipUpdate}
                    onExport={(clip) => setExportClip(clip)}
                    onEdit={(clip) => setEditClip(clip)}
                    userPlan={user?.plan || "free"}
                  />
                ))}
              </div>
            )}
          </div>

          {video.transcript && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">Transcript</h2>
                    <p className="text-xs text-muted-foreground">AI-generated via Whisper</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <ScrollArea className="h-64">
                    <div className="p-5">
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap" data-testid="text-transcript">
                        {video.transcript}
                      </p>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteClipId} onOpenChange={() => setDeleteClipId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clip</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this clip. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClipId && deleteClipMutation.mutate(deleteClipId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-clip"
            >
              Delete Clip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteVideo} onOpenChange={setShowDeleteVideo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{video.title}" and all its generated clips. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVideoMutation.mutate()}
              disabled={deleteVideoMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-video"
            >
              {deleteVideoMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
              Delete Video
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editClip && (
        <ClipEditorDialog
          open={!!editClip}
          onOpenChange={(open) => !open && setEditClip(null)}
          clip={editClip}
          videoDuration={video?.duration || 120}
          onRegenerated={() => refetch()}
        />
      )}

      {exportClip && (
        <ExportDialog
          open={!!exportClip}
          onOpenChange={(open) => !open && setExportClip(null)}
          clip={exportClip}
          connectedAccounts={connectedAccounts}
        />
      )}
    </div>
  );
}
