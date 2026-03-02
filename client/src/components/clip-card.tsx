import { Clip } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Flame, Clock, Send, Play, ShieldAlert, Scissors, Settings2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ClipCardProps {
  clip: Clip;
  onDelete?: (id: string) => void;
  onUpdate?: (clip: Clip) => void;
  onExport?: (clip: Clip) => void;
  onEdit?: (clip: Clip) => void;
  userPlan?: string;
}

function viralityColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClipCard({ clip, onDelete, onUpdate, onExport, onEdit, userPlan = "free" }: ClipCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();
  const clipAny = clip as any;
  const hasVideo = !!(clipAny.hasClipFile || clipAny.hasWatermark || clip.clipFilePath || clip.watermarkedFilePath);

  const handleDownload = async () => {
    if (!hasVideo) {
      toast({ title: "Clip file not available", description: "The clip file has not been generated yet.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/v1/clips/${clip.id}/download`, { credentials: "include" });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const disposition = res.headers.get("Content-Disposition");
        const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
        link.href = url;
        link.download = filenameMatch?.[1] || clip.filename || `clip_${clip.id}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
          title: userPlan === "pro" ? "Clean clip downloaded" : "Watermarked clip downloaded",
          description: userPlan === "pro"
            ? `${clip.title} — No watermark (Pro)`
            : `${clip.title} — Upgrade to Pro for clean downloads`,
        });
      } else {
        const json = await res.json();
        if (json.upgradeRequired) {
          toast({
            title: "Pro plan required",
            description: "Upgrade to Pro to download clean clips without the Clipora watermark.",
            variant: "destructive",
          });
        } else {
          toast({ title: json.error || "Download failed", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  return (
    <>
      <Card className="hover-elevate group" data-testid={`card-clip-${clip.id}`}>
        <CardContent className="p-0">
          <div
            className="relative aspect-[9/16] max-h-48 bg-gradient-to-br from-primary/15 via-muted to-primary/5 rounded-t-lg flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => hasVideo && setPreviewOpen(true)}
            data-testid={`clip-preview-${clip.id}`}
          >
            {(clipAny.hasThumbnail || clip.thumbnailPath) ? (
              <img
                src={`/api/v1/clips/${clip.id}/thumbnail`}
                alt={clip.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : null}
            <div className={`text-center ${(clipAny.hasThumbnail || clip.thumbnailPath) ? "absolute inset-0 flex flex-col items-center justify-center bg-black/30" : ""}`}>
              {hasVideo ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                  <p className="text-[11px] font-mono text-white/80 mt-1">{formatTime(clip.startTime)} → {formatTime(clip.endTime)}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs font-mono text-muted-foreground">{formatTime(clip.startTime)} → {formatTime(clip.endTime)}</p>
                  <p className="text-xs text-muted-foreground">{clip.duration.toFixed(0)}s</p>
                </div>
              )}
            </div>

            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className={`gap-1 text-[10px] font-bold px-1.5 py-0 ${viralityColor(clip.viralityScore)}`}>
                <Flame className="w-2.5 h-2.5" />
                {clip.viralityScore}
              </Badge>
            </div>
            <div className="absolute top-2 left-2">
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 bg-black/40 text-white border-0 backdrop-blur-sm">
                <Clock className="w-2.5 h-2.5" />
                {clip.duration.toFixed(0)}s
              </Badge>
            </div>

            {clipAny.captionStyle && clipAny.captionStyle !== "none" && (
              <div className="absolute bottom-2 left-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-black/40 text-white border-0 backdrop-blur-sm capitalize">
                  CC: {clipAny.captionStyle}
                </Badge>
              </div>
            )}
          </div>

          <div className="p-3 space-y-2">
            <h3 className="font-semibold text-sm leading-tight truncate" data-testid={`text-clip-title-${clip.id}`}>{clip.title}</h3>

            {clip.transcriptSegment && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 italic leading-relaxed">"{clip.transcriptSegment}"</p>
            )}

            {clip.hashtags && clip.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {clip.hashtags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[11px] text-primary/70 font-medium">{tag}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 pt-1">
              <Button
                size="sm"
                variant="default"
                className="flex-1 gap-1.5 h-7 text-xs"
                onClick={handleDownload}
                data-testid={`button-download-clip-${clip.id}`}
              >
                {userPlan === "pro" ? (
                  <><Download className="w-3 h-3" />Download HD</>
                ) : (
                  <><ShieldAlert className="w-3 h-3" />Download</>
                )}
              </Button>
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onEdit(clip)}
                  data-testid={`button-edit-clip-${clip.id}`}
                  title="Edit & customize clip"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
              )}
              {onExport && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onExport(clip)}
                  data-testid={`button-export-clip-${clip.id}`}
                  title="Export to social media"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(clip.id)}
                  data-testid={`button-delete-clip-${clip.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-black aspect-[9/16] max-h-[70vh] flex items-center justify-center">
            {previewOpen && hasVideo && (
              <video
                key={clip.id}
                controls
                autoPlay
                className="w-full h-full object-contain"
                data-testid={`video-player-${clip.id}`}
              >
                <source src={`/api/v1/clips/${clip.id}/stream`} type="video/mp4" />
              </video>
            )}
          </div>
          <div className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{clip.title}</p>
              <p className="text-xs text-muted-foreground">Watermarked preview</p>
            </div>
            {userPlan !== "pro" && (
              <Badge variant="outline" className="text-xs gap-1">
                <ShieldAlert className="w-3 h-3" />
                Watermarked
              </Badge>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
