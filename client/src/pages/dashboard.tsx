import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Upload, Film, Plus, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { VideoCard } from "@/components/video-card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { api } from "@/lib/api";

async function fetchVideos() {
  const res = await api.videos.list();
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load videos");
  return json.data;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: videos, isLoading, refetch } = useQuery({
    queryKey: ["/api/v1/videos/list"],
    queryFn: fetchVideos,
    refetchInterval: (data) => {
      if (!data || !Array.isArray(data)) return false;
      const hasActiveJob = data.some(
        (v: any) => v.job?.status === "pending" || v.job?.status === "processing"
      );
      return hasActiveJob ? 3000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.videos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/videos/list"] });
      toast({ title: "Video deleted" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete video", variant: "destructive" });
    },
  });

  const pendingCount = videos?.filter(
    (v: any) => v.job?.status === "pending" || v.job?.status === "processing"
  ).length || 0;

  const completedCount = videos?.filter((v: any) => v.status === "completed").length || 0;
  const totalClips = videos?.reduce((acc: number, v: any) => acc + (v.clipCount || 0), 0) || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user?.username}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Link href="/upload">
            <Button size="sm" className="gap-2" data-testid="button-upload-new">
              <Plus className="w-4 h-4" />
              Upload Video
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Videos", value: videos?.length ?? "—", desc: user?.plan === "free" ? `${user.videoCount}/3 free` : "Unlimited" },
            { label: "Processing", value: pendingCount, desc: pendingCount > 0 ? "In progress" : "All done" },
            { label: "Clips Generated", value: totalClips, desc: `From ${completedCount} completed videos` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.desc}</p>
            </div>
          ))}
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            <span className="text-primary font-medium">{pendingCount} video{pendingCount > 1 ? "s" : ""} being processed</span>
            <span className="text-muted-foreground">— refreshing automatically</span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Your Videos</h2>
            {user?.plan === "free" && (
              <Badge variant="outline" className="text-xs">
                {user.videoCount}/3 free videos used
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                  <Skeleton className="h-36 w-full rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : videos && videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video: any) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-border">
              <Film className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium mb-1">No videos yet</p>
              <p className="text-sm text-muted-foreground mb-4">Upload your first video to get started</p>
              <Link href="/upload">
                <Button className="gap-2" data-testid="button-upload-empty-state">
                  <Upload className="w-4 h-4" />
                  Upload Your First Video
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the video and all its generated clips. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete Video
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
