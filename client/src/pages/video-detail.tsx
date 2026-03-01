import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipCard } from "@/components/clip-card";
import {
  ArrowLeft, Film, RefreshCw, Play, CheckCircle2, AlertCircle,
  Loader2, Clock, Scissors, FileText, Zap, Trash2
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Clip } from "@shared/schema";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

async function fetchVideoDetail(id: string) {
  const res = await api.videos.get(id);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Video not found");
  return json.data;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>;
  if (status === "processing") return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Processing</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Failed</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteClipId, setDeleteClipId] = useState<string | null>(null);

  const { data: video, isLoading, refetch } = useQuery({
    queryKey: ["/api/v1/videos", id],
    queryFn: () => fetchVideoDetail(id),
    refetchInterval: (data) => {
      if (!data) return false;
      const status = data.job?.status;
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
        <div className="border-b border-border px-6 py-4">
          <Skeleton className="h-6 w-48 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Film className="w-12 h-12 text-muted-foreground/30" />
        <p className="font-medium">Video not found</p>
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const job = video.job;
  const clips: Clip[] = video.clips || [];
  const status = job?.status || video.status;
  const progress = job?.progress || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard">
            <Button size="icon" variant="ghost" className="mt-0.5 flex-shrink-0" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold leading-tight" data-testid="text-video-title">{video.title}</h1>
            <p className="text-sm text-muted-foreground truncate max-w-xs">{video.originalFilename}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={status} />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-5">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Processing Status</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={status} />
                  {job?.currentStep && (
                    <span className="text-xs text-muted-foreground italic">{job.currentStep}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(status === "failed" || (!job && status === "pending")) && (
                  <Button
                    size="sm"
                    onClick={() => processMutation.mutate()}
                    disabled={processMutation.isPending}
                    className="gap-2"
                    data-testid="button-process"
                  >
                    {processMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : <Play className="w-3.5 h-3.5" />}
                    {status === "failed" ? "Retry Processing" : "Start Processing"}
                  </Button>
                )}
              </div>
            </div>

            {(status === "pending" || status === "processing") && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-bar" />
              </div>
            )}

            {status === "failed" && job?.errorLog && (
              <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3">
                <p className="text-xs text-destructive font-medium mb-1">Error Details</p>
                <p className="text-xs text-muted-foreground font-mono">{job.errorLog}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: "File Size", value: video.fileSize ? `${(video.fileSize / (1024 * 1024)).toFixed(1)} MB` : "—" },
                { label: "Clips Generated", value: clips.length.toString() },
                { label: "Avg. Virality", value: clips.length > 0 ? `${Math.round(clips.reduce((a, c) => a + c.viralityScore, 0) / clips.length)}/100` : "—" },
                { label: "Uploaded", value: video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) : "—" },
              ].map(stat => (
                <div key={stat.label} className="rounded-md bg-muted/50 p-2.5">
                  <p className="text-muted-foreground mb-0.5">{stat.label}</p>
                  <p className="font-semibold text-sm">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <Tabs defaultValue="clips">
            <TabsList>
              <TabsTrigger value="clips" className="gap-1.5" data-testid="tab-clips">
                <Scissors className="w-3.5 h-3.5" />
                Clips ({clips.length})
              </TabsTrigger>
              <TabsTrigger value="transcript" className="gap-1.5" data-testid="tab-transcript">
                <FileText className="w-3.5 h-3.5" />
                Transcript
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clips" className="mt-4">
              {status !== "completed" && clips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-border">
                  <Scissors className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-sm mb-1">
                    {status === "processing" ? "Generating clips…" : "No clips yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {status === "processing"
                      ? "AI is analyzing your video and detecting highlight moments"
                      : status === "pending"
                        ? "Processing will start shortly"
                        : "Start processing to generate AI clips"}
                  </p>
                  {status === "processing" && (
                    <Loader2 className="w-5 h-5 animate-spin text-primary mt-3" />
                  )}
                </div>
              ) : clips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-border">
                  <Scissors className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-sm mb-1">No clips generated</p>
                  <p className="text-xs text-muted-foreground">Reprocess the video to generate clips</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{clips.length} AI-generated clips</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Sorted by virality score
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clips.map(clip => (
                      <ClipCard
                        key={clip.id}
                        clip={clip}
                        onDelete={(clipId) => setDeleteClipId(clipId)}
                        onUpdate={handleClipUpdate}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transcript" className="mt-4">
              {video.transcript ? (
                <div className="rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">AI Transcript</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      Whisper AI
                    </Badge>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="p-4">
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {video.transcript}
                      </p>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-border">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-sm mb-1">
                    {status === "processing" ? "Transcribing audio…" : "No transcript yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {status === "processing"
                      ? "Whisper is transcribing your video"
                      : "Process your video to generate a transcript"}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
    </div>
  );
}
