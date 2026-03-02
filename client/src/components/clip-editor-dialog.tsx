import { Clip } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Scissors, Type, Sparkles, RefreshCw } from "lucide-react";

interface ClipEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clip: Clip;
  videoDuration: number;
  onRegenerated?: () => void;
}

const CAPTION_STYLE_PREVIEWS = [
  { id: "classic", name: "Classic", preview: "White text, black outline", color: "bg-white text-black border border-black" },
  { id: "bold", name: "Bold", preview: "Large yellow text", color: "bg-yellow-400 text-black" },
  { id: "boxed", name: "Boxed", preview: "White on dark background", color: "bg-black/70 text-white" },
  { id: "neon", name: "Neon", preview: "Glowing teal text", color: "bg-emerald-400 text-black" },
  { id: "minimal", name: "Minimal", preview: "Subtle white text", color: "bg-white/80 text-gray-700" },
  { id: "none", name: "No Captions", preview: "Clean video only", color: "bg-muted text-muted-foreground" },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export function ClipEditorDialog({ open, onOpenChange, clip, videoDuration, onRegenerated }: ClipEditorDialogProps) {
  const { toast } = useToast();
  const [startTime, setStartTime] = useState(clip.startTime);
  const [endTime, setEndTime] = useState(clip.endTime);
  const [captionStyle, setCaptionStyle] = useState((clip as any).captionStyle || "classic");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (open) {
      setStartTime(clip.startTime);
      setEndTime(clip.endTime);
      setCaptionStyle((clip as any).captionStyle || "classic");
    }
  }, [open, clip]);

  const duration = endTime - startTime;
  const maxEnd = Math.min(videoDuration, clip.startTime + 120);
  const minStart = Math.max(0, clip.endTime - 120);

  const handleRegenerate = async () => {
    if (duration < 1) {
      toast({ title: "Clip too short", description: "Minimum clip length is 1 second", variant: "destructive" });
      return;
    }
    setRegenerating(true);
    try {
      const res = await api.clips.regenerate(clip.id, { startTime, endTime, captionStyle });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Regenerating clip", description: "Your clip is being re-rendered with the new settings. This may take a moment." });
        onOpenChange(false);
        setTimeout(() => onRegenerated?.(), 3000);
      } else {
        toast({ title: json.error || "Failed to regenerate", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to regenerate clip", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const hasChanges = startTime !== clip.startTime || endTime !== clip.endTime || captionStyle !== ((clip as any).captionStyle || "classic");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-clip-editor">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            Edit Clip
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium truncate" data-testid="text-editor-clip-title">{clip.title}</p>
            {clip.transcriptSegment && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{clip.transcriptSegment}"</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-sm font-semibold">Trim</Label>
              <Badge variant="outline" className="ml-auto text-[11px]">{duration.toFixed(1)}s</Badge>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Start Time</span>
                  <span className="text-xs font-mono font-medium" data-testid="text-start-time">{formatTime(startTime)}</span>
                </div>
                <Slider
                  value={[startTime]}
                  min={minStart}
                  max={Math.max(minStart, endTime - 1)}
                  step={0.1}
                  onValueChange={([v]) => setStartTime(v)}
                  data-testid="slider-start-time"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">End Time</span>
                  <span className="text-xs font-mono font-medium" data-testid="text-end-time">{formatTime(endTime)}</span>
                </div>
                <Slider
                  value={[endTime]}
                  min={startTime + 1}
                  max={maxEnd}
                  step={0.1}
                  onValueChange={([v]) => setEndTime(v)}
                  data-testid="slider-end-time"
                />
              </div>
            </div>

            <div className="h-2 rounded-full bg-muted overflow-hidden relative">
              <div
                className="absolute h-full bg-primary/30 rounded-full"
                style={{
                  left: `${(startTime / videoDuration) * 100}%`,
                  width: `${((endTime - startTime) / videoDuration) * 100}%`,
                }}
              />
              <div
                className="absolute h-full bg-primary/10 rounded-full"
                style={{
                  left: `${(clip.startTime / videoDuration) * 100}%`,
                  width: `${((clip.endTime - clip.startTime) / videoDuration) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-sm font-semibold">Caption Style</Label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {CAPTION_STYLE_PREVIEWS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setCaptionStyle(style.id)}
                  className={`
                    relative rounded-lg border-2 p-2.5 text-center transition-all cursor-pointer
                    ${captionStyle === style.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                    }
                  `}
                  data-testid={`button-caption-style-${style.id}`}
                >
                  <div className={`mx-auto w-fit rounded px-2 py-0.5 text-[10px] font-bold mb-1 ${style.color}`}>
                    Aa
                  </div>
                  <p className="text-[11px] font-medium">{style.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={regenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={regenerating || !hasChanges}
            className="gap-1.5"
            data-testid="button-regenerate-clip"
          >
            {regenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Regenerating…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Regenerate Clip
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
