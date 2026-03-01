import { Video } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Film, Clock, Scissors, Trash2, Play, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface VideoWithJob extends Video {
  job?: { status: string; progress: number; currentStep?: string | null } | null;
  clipCount?: number;
}

interface VideoCardProps {
  video: VideoWithJob;
  onDelete?: (id: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>;
  if (status === "processing") return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Processing</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Failed</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const status = video.job?.status || video.status;
  const progress = video.job?.progress || 0;

  return (
    <Card className="hover-elevate group" data-testid={`card-video-${video.id}`}>
      <CardContent className="p-0">
        <div className="relative h-36 bg-muted rounded-t-lg flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
          <Film className="w-12 h-12 text-muted-foreground/40" />
          {status === "processing" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/20">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="p-3 space-y-2">
          <div>
            <h3 className="font-semibold text-sm truncate" data-testid={`text-video-title-${video.id}`}>{video.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{video.originalFilename}</p>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatFileSize(video.fileSize)}</span>
            {(video.clipCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                {video.clipCount} clips
              </span>
            )}
            {video.createdAt && (
              <span className="ml-auto">{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
            )}
          </div>

          {status === "processing" && video.job?.currentStep && (
            <p className="text-xs text-muted-foreground truncate italic">{video.job.currentStep}…</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Link href={`/video/${video.id}`} className="flex-1">
              <Button size="sm" variant="secondary" className="w-full gap-1.5" data-testid={`button-view-video-${video.id}`}>
                <Play className="w-3 h-3" />
                View
              </Button>
            </Link>
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDelete(video.id)}
                data-testid={`button-delete-video-${video.id}`}
                className="text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
