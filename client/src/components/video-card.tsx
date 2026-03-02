import { Video } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Film, Clock, Scissors, Trash2, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface VideoWithJob extends Video {
  job?: { status: string; progress: number; currentStep?: string | null } | null;
  clipCount?: number;
  hasThumbnail?: boolean;
}

interface VideoCardProps {
  video: VideoWithJob;
  onDelete?: (id: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge variant="default" className="gap-1 text-[10px] px-1.5 py-0"><CheckCircle2 className="w-2.5 h-2.5" />Done</Badge>;
  if (status === "processing") return <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0"><Loader2 className="w-2.5 h-2.5 animate-spin" />Processing</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0"><AlertCircle className="w-2.5 h-2.5" />Failed</Badge>;
  return <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0"><Clock className="w-2.5 h-2.5" />Pending</Badge>;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const [, navigate] = useLocation();
  const status = video.job?.status || video.status;
  const progress = video.job?.progress || 0;
  const [thumbError, setThumbError] = useState(false);
  const showThumbnail = video.hasThumbnail && !thumbError;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-stop-propagation]')) return;
    navigate(`/video/${video.id}`);
  };

  return (
    <Card
      className="hover-elevate group cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary/20"
      data-testid={`card-video-${video.id}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
          {showThumbnail ? (
            <img
              src={`/api/v1/videos/${video.id}/thumbnail`}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={() => setThumbError(true)}
              data-testid={`img-video-thumb-${video.id}`}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-muted to-primary/5 flex items-center justify-center">
              <Film className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}

          {status === "processing" && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
              <span className="text-white text-xs font-medium">{Math.round(progress)}%</span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="absolute top-2 left-2">
            <StatusBadge status={status} />
          </div>

          {(video.clipCount ?? 0) > 0 && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0 bg-black/60 text-white border-0 backdrop-blur-sm">
                <Scissors className="w-2.5 h-2.5" />
                {video.clipCount}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-3 space-y-1.5">
          <h3 className="font-semibold text-sm truncate leading-tight" data-testid={`text-video-title-${video.id}`}>{video.title}</h3>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formatFileSize(video.fileSize)}</span>
            {video.createdAt && (
              <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
            )}
          </div>

          {status === "processing" && video.job?.currentStep && (
            <p className="text-[11px] text-primary truncate">{video.job.currentStep}…</p>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 h-7 text-xs"
              data-testid={`button-view-video-${video.id}`}
            >
              View Details
            </Button>
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(video.id); }}
                data-testid={`button-delete-video-${video.id}`}
                data-stop-propagation
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
