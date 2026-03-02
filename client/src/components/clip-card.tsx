import { Clip } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Edit2, Flame, Clock, Hash, Send } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ClipCardProps {
  clip: Clip;
  onDelete?: (id: string) => void;
  onUpdate?: (clip: Clip) => void;
  onExport?: (clip: Clip) => void;
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

export function ClipCard({ clip, onDelete, onUpdate, onExport }: ClipCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState(clip.title);
  const [description, setDescription] = useState(clip.description || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.clips.update(clip.id, { title, description });
      const json = await res.json();
      if (res.ok) {
        onUpdate?.(json.data);
        setEditOpen(false);
        toast({ title: "Clip updated" });
      } else {
        toast({ title: json.error || "Update failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (clip.clipFilePath) {
      const link = document.createElement("a");
      link.href = `/api/v1/clips/${clip.id}/download`;
      link.download = clip.filename || `clip_${clip.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Download started", description: `${clip.title} — Downloading clip` });
    } else {
      toast({ title: "Clip file not available", description: "The clip file has not been generated yet. Please process the video first.", variant: "destructive" });
    }
  };

  return (
    <>
      <Card className="hover-elevate" data-testid={`card-clip-${clip.id}`}>
        <CardContent className="p-0">
          <div className="relative h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-muted rounded-t-lg flex items-center justify-center overflow-hidden">
            {clip.thumbnailPath ? (
              <img
                src={`/api/v1/clips/${clip.id}/thumbnail`}
                alt={clip.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : null}
            <div className={`text-center ${clip.thumbnailPath ? "absolute inset-0 flex flex-col items-center justify-center bg-black/40" : ""}`}>
              <p className="text-xs font-mono text-muted-foreground">{formatTime(clip.startTime)} → {formatTime(clip.endTime)}</p>
              <p className="text-xs text-muted-foreground mt-1">{clip.duration.toFixed(0)}s</p>
            </div>
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className={`gap-1 text-xs font-bold ${viralityColor(clip.viralityScore)}`}>
                <Flame className="w-3 h-3" />
                {clip.viralityScore}
              </Badge>
            </div>
            <div className="absolute top-2 left-2">
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="w-3 h-3" />
                {clip.duration.toFixed(0)}s
              </Badge>
            </div>
          </div>

          <div className="p-3 space-y-2">
            <h3 className="font-semibold text-sm leading-tight" data-testid={`text-clip-title-${clip.id}`}>{clip.title}</h3>

            {clip.transcriptSegment && (
              <p className="text-xs text-muted-foreground line-clamp-2 italic">"{clip.transcriptSegment}"</p>
            )}

            {clip.hashtags && clip.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {clip.hashtags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs text-primary/80 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-1">
              <Button
                size="sm"
                variant="default"
                className="flex-1 gap-1.5"
                onClick={handleDownload}
                data-testid={`button-download-clip-${clip.id}`}
              >
                <Download className="w-3 h-3" />
                Download
              </Button>
              {onExport && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onExport(clip)}
                  data-testid={`button-export-clip-${clip.id}`}
                  title="Export to social media"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditOpen(true)}
                data-testid={`button-edit-clip-${clip.id}`}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(clip.id)}
                  data-testid={`button-delete-clip-${clip.id}`}
                  className="text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Clip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="clip-title">Title</Label>
              <Input
                id="clip-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                data-testid="input-clip-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clip-desc">Description</Label>
              <Textarea
                id="clip-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                data-testid="input-clip-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Start:</span> {formatTime(clip.startTime)}
              </div>
              <div>
                <span className="font-medium text-foreground">End:</span> {formatTime(clip.endTime)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-clip">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
