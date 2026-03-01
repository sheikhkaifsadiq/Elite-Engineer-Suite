import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Send, Loader2, CheckCircle2, AlertCircle, Wand2, ExternalLink,
  Hash, FileText, Type
} from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiX, SiFacebook, SiLinkedin } from "react-icons/si";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Clip, ConnectedAccount } from "@shared/schema";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clip: Clip;
  connectedAccounts: ConnectedAccount[];
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram Reels", icon: SiInstagram, color: "text-pink-500" },
  { id: "tiktok", label: "TikTok", icon: SiTiktok, color: "" },
  { id: "youtube", label: "YouTube Shorts", icon: SiYoutube, color: "text-red-500" },
  { id: "twitter", label: "X / Twitter", icon: SiX, color: "" },
  { id: "facebook", label: "Facebook", icon: SiFacebook, color: "text-blue-600" },
  { id: "linkedin", label: "LinkedIn", icon: SiLinkedin, color: "text-blue-500" },
];

type ExportState = "select" | "generating" | "preview" | "exporting" | "done" | "error";

export function ExportDialog({ open, onOpenChange, clip, connectedAccounts }: ExportDialogProps) {
  const [platform, setPlatform] = useState<string>("");
  const [state, setState] = useState<ExportState>("select");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoHashtags, setSeoHashtags] = useState<string[]>([]);
  const [exportError, setExportError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setState("select");
      setPlatform("");
      setSeoTitle("");
      setSeoDescription("");
      setSeoHashtags([]);
      setExportError("");
    }
  }, [open]);

  const connectedPlatforms = connectedAccounts.filter(a => a.connected).map(a => a.platform);

  const handleGenerateSEO = async () => {
    if (!platform) return;
    setState("generating");
    try {
      const res = await api.exports.generateSEO({ clipId: clip.id, platform });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate");
      setSeoTitle(json.data.title);
      setSeoDescription(json.data.description);
      setSeoHashtags(json.data.hashtags);
      setState("preview");
    } catch (err: any) {
      toast({ title: "Failed to generate SEO content", description: err.message, variant: "destructive" });
      setState("select");
    }
  };

  const handleExport = async () => {
    setState("exporting");
    try {
      const res = await api.exports.create({ clipId: clip.id, platform });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Export failed");
      setState("done");
      toast({ title: "Export started!", description: `Your clip is being published to ${platform}` });
    } catch (err: any) {
      setState("error");
      setExportError(err.message || "Export failed");
    }
  };

  const selectedPlatform = PLATFORMS.find(p => p.id === platform);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Export to Social Media
          </DialogTitle>
          <DialogDescription>
            Publish "{clip.title}" with AI-optimized SEO content
          </DialogDescription>
        </DialogHeader>

        {state === "select" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Choose Platform</Label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => {
                  const isConnected = connectedPlatforms.includes(p.id);
                  return (
                    <Button
                      key={p.id}
                      variant={platform === p.id ? "default" : "outline"}
                      size="sm"
                      className="gap-2 justify-start"
                      onClick={() => setPlatform(p.id)}
                      data-testid={`button-platform-${p.id}`}
                    >
                      <p.icon className={`w-4 h-4 ${platform === p.id ? "" : p.color}`} />
                      <span className="flex-1 text-left">{p.label}</span>
                      {isConnected && (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {platform && !connectedPlatforms.includes(platform) && (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">Account not connected</p>
                  <p className="text-muted-foreground mt-0.5">
                    Connect your {selectedPlatform?.label} account in Settings first to enable direct publishing.
                    You can still preview the AI-generated SEO content.
                  </p>
                </div>
              </div>
            )}

            <Button
              className="w-full gap-2"
              disabled={!platform}
              onClick={handleGenerateSEO}
              data-testid="button-generate-seo"
            >
              <Wand2 className="w-4 h-4" />
              Generate AI SEO Content
            </Button>
          </div>
        )}

        {state === "generating" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Generating {selectedPlatform?.label} SEO content…</p>
            <p className="text-xs text-muted-foreground">Optimizing title, description, and hashtags with AI</p>
          </div>
        )}

        {state === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {selectedPlatform && <selectedPlatform.icon className={`w-4 h-4 ${selectedPlatform.color}`} />}
              <span>AI-Generated SEO for {selectedPlatform?.label}</span>
              <Badge variant="secondary" className="text-xs ml-auto">AI</Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Type className="w-3 h-3" /> Title
              </Label>
              <Input
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                data-testid="input-seo-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <FileText className="w-3 h-3" /> Description
              </Label>
              <Textarea
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                rows={4}
                data-testid="input-seo-description"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Hash className="w-3 h-3" /> Hashtags
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {seoHashtags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs cursor-pointer" data-testid={`badge-hashtag-${i}`}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateSEO}
                className="gap-1.5"
                data-testid="button-regenerate-seo"
              >
                <Wand2 className="w-3 h-3" />
                Regenerate
              </Button>
            </div>
          </div>
        )}

        {state === "exporting" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Publishing to {selectedPlatform?.label}…</p>
            <p className="text-xs text-muted-foreground">Your clip is being uploaded and published</p>
          </div>
        )}

        {state === "done" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium">Export Initiated!</p>
            <p className="text-sm text-muted-foreground">
              Your clip has been queued for publishing to {selectedPlatform?.label}.
              It will appear on your profile shortly.
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="font-medium">Export Failed</p>
            <p className="text-sm text-muted-foreground">{exportError}</p>
          </div>
        )}

        <DialogFooter>
          {state === "preview" && (
            <div className="flex gap-2 w-full">
              <Button variant="ghost" onClick={() => setState("select")} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleExport}
                disabled={!connectedPlatforms.includes(platform)}
                className="flex-1 gap-2"
                data-testid="button-publish"
              >
                <Send className="w-3.5 h-3.5" />
                Publish to {selectedPlatform?.label}
              </Button>
            </div>
          )}
          {(state === "done" || state === "error") && (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
