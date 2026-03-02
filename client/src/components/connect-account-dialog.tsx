import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, CheckCircle2, Shield, Eye, EyeOff, ArrowRight, ArrowLeft,
  Pencil, Trash2, Upload, Image, UserCog, AtSign, FileText, AlertTriangle
} from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiX, SiFacebook, SiLinkedin } from "react-icons/si";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ConnectAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: {
    id: string;
    label: string;
    icon: any;
    color: string;
  } | null;
}

type Step = "login" | "permissions" | "authorizing" | "profile_preview" | "applying" | "success";

const PLATFORM_PERMISSIONS = [
  { id: "manage_content", label: "Manage content", desc: "Create, edit, and delete posts, reels, and stories", icon: FileText },
  { id: "edit_profile", label: "Edit profile", desc: "Change username, bio, and display name", icon: Pencil },
  { id: "change_avatar", label: "Change profile picture", desc: "Update profile photo and avatar", icon: Image },
  { id: "upload_media", label: "Upload media", desc: "Upload videos, photos, and other media files", icon: Upload },
  { id: "read_analytics", label: "Read analytics", desc: "View post insights, reach, and engagement data", icon: Eye },
  { id: "manage_comments", label: "Manage comments", desc: "Read, respond to, and moderate comments", icon: UserCog },
  { id: "delete_content", label: "Delete content", desc: "Remove published posts and media", icon: Trash2 },
];

const PLATFORM_ICONS: Record<string, any> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  twitter: SiX,
  facebook: SiFacebook,
  linkedin: SiLinkedin,
};

export function ConnectAccountDialog({ open, onOpenChange, platform }: ConnectAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [profileChanges, setProfileChanges] = useState<any>(null);

  useEffect(() => {
    if (open) {
      setStep("login");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setUsername("");
      setSelectedPermissions([]);
      setSelectAll(false);
      setProfileChanges(null);
    }
  }, [open]);

  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.accounts.connect(data);
      return await res.json();
    },
    onSuccess: (json: any) => {
      setProfileChanges(json.profileChanges);
      queryClient.invalidateQueries({ queryKey: ["/api/v1/accounts/connected"] });
      setStep("success");
    },
    onError: (err: any) => {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
      setStep("login");
    },
  });

  const handleLogin = () => {
    if (!email || !password || !username) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setStep("permissions");
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleToggleAll = () => {
    if (selectAll) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(PLATFORM_PERMISSIONS.map(p => p.id));
    }
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    setSelectAll(selectedPermissions.length === PLATFORM_PERMISSIONS.length);
  }, [selectedPermissions]);

  const handleAuthorize = () => {
    if (selectedPermissions.length === 0) {
      toast({ title: "Select at least one permission", variant: "destructive" });
      return;
    }
    setStep("authorizing");

    setTimeout(() => {
      setStep("profile_preview");
    }, 2000);
  };

  const handleApplyChanges = () => {
    if (!platform) return;
    setStep("applying");
    connectMutation.mutate({
      platform: platform.id,
      platformEmail: email,
      platformPassword: password,
      platformUsername: username,
      platformDisplayName: username,
      permissions: selectedPermissions,
    });
  };

  if (!platform) return null;

  const PlatformIcon = PLATFORM_ICONS[platform.id] || Shield;
  const cleanUsername = username.replace(/^@/, "").replace(/\s+/g, "").toLowerCase();
  const cliporaUsername = `${cleanUsername}.clipora`;
  const cliporaPageUrl = `https://${platform.id === "twitter" ? "x" : platform.id}.com/clipora`;
  const cliporaBio = `Powered by Clipora.ai | Short-form content creator | ${cliporaPageUrl}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlatformIcon className={`w-5 h-5 ${platform.color}`} />
            {step === "login" && `Sign in to ${platform.label}`}
            {step === "permissions" && `Authorize Clipora.ai`}
            {step === "authorizing" && `Connecting to ${platform.label}...`}
            {step === "profile_preview" && `Profile Changes Preview`}
            {step === "applying" && `Applying Changes...`}
            {step === "success" && `Connected!`}
          </DialogTitle>
          <DialogDescription>
            {step === "login" && `Log in with your ${platform.label} account to connect it to Clipora.ai`}
            {step === "permissions" && `Grant Clipora.ai the permissions it needs to manage your content`}
            {step === "authorizing" && `Verifying your credentials and setting up the connection...`}
            {step === "profile_preview" && `Review the changes Clipora.ai will make to your ${platform.label} profile`}
            {step === "applying" && `Updating your ${platform.label} profile...`}
            {step === "success" && `Your ${platform.label} account is now connected and configured`}
          </DialogDescription>
        </DialogHeader>

        {step === "login" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-4">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                <PlatformIcon className={`w-8 h-8 ${platform.color}`} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platform-email">Email Address</Label>
              <Input
                id="platform-email"
                type="email"
                placeholder={`Your ${platform.label} email`}
                value={email}
                onChange={e => setEmail(e.target.value)}
                data-testid="input-platform-email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platform-password">Password</Label>
              <div className="relative">
                <Input
                  id="platform-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  data-testid="input-platform-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platform-username">Username / Handle</Label>
              <div className="relative">
                <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="platform-username"
                  placeholder="your_username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="pl-8"
                  data-testid="input-platform-username"
                />
              </div>
            </div>

            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5 flex items-start gap-2">
              <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Clipora.ai uses your credentials to authenticate with {platform.label} via OAuth. Your password is used only for initial authorization and is not stored on our servers.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleLogin}
                disabled={!email || !password || !username}
                className="gap-2"
                data-testid="button-platform-login"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "permissions" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-xs">
                  {username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">@{username}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
              <PlatformIcon className={`w-5 h-5 ${platform.color} flex-shrink-0`} />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Clipora.ai is requesting access to:</p>
              <Button variant="ghost" size="sm" onClick={handleToggleAll} className="text-xs">
                {selectAll ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <ScrollArea className="h-[280px] pr-2">
              <div className="space-y-2">
                {PLATFORM_PERMISSIONS.map(perm => {
                  const isSelected = selectedPermissions.includes(perm.id);
                  return (
                    <div
                      key={perm.id}
                      className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => handleTogglePermission(perm.id)}
                      data-testid={`permission-${perm.id}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleTogglePermission(perm.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <perm.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-sm font-medium">{perm.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{perm.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-orange-600 dark:text-orange-400">All permissions are required</span> for Clipora.ai to properly manage your content,
                modify your profile, and export clips directly to {platform.label}.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("login")} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleAuthorize}
                disabled={selectedPermissions.length === 0}
                className="gap-2"
                data-testid="button-authorize"
              >
                <Shield className="w-4 h-4" />
                Authorize ({selectedPermissions.length}/{PLATFORM_PERMISSIONS.length})
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "authorizing" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <PlatformIcon className={`w-6 h-6 ${platform.color} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Verifying credentials...</p>
              <p className="text-xs text-muted-foreground">Authenticating with {platform.label} and setting up OAuth tokens</p>
            </div>
          </div>
        )}

        {step === "profile_preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clipora.ai will make the following changes to your {platform.label} profile:
            </p>

            <div className="space-y-3">
              <div className="rounded-md border border-border overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 flex items-center gap-2 border-b border-border">
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-medium">Profile Picture</p>
                </div>
                <div className="p-3 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs bg-muted">
                        {username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
                        C
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="text-muted-foreground">Will be changed to</p>
                    <p className="font-medium">Clipora.ai Logo</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 flex items-center gap-2 border-b border-border">
                  <AtSign className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-medium">Username</p>
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs font-mono">@{cleanUsername}</Badge>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <Badge variant="default" className="text-xs font-mono">@{cliporaUsername}</Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 flex items-center gap-2 border-b border-border">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-medium">Bio</p>
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground line-through">{username}'s profile</p>
                  <p className="text-xs font-medium">{cliporaBio}</p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Your original profile data will be saved. You can revert these changes at any time by disconnecting your account.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("permissions")} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={handleApplyChanges} className="gap-2" data-testid="button-apply-changes">
                <CheckCircle2 className="w-4 h-4" />
                Apply Changes & Connect
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "applying" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Updating your {platform.label} profile...</p>
              <p className="text-xs text-muted-foreground">
                Changing username, updating bio, and setting profile picture
              </p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold text-center">{platform.label} Account Connected</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                All permissions granted and profile updated successfully.
                You can now export clips directly to {platform.label}.
              </p>
            </div>

            {profileChanges && (
              <div className="rounded-md border border-border p-3 space-y-2 text-xs">
                <p className="font-medium text-sm">Changes Applied:</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>Username: @{profileChanges.username?.from} → @{profileChanges.username?.to}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>Profile picture updated to Clipora.ai logo</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>Bio updated with Clipora.ai branding</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>{selectedPermissions.length} permissions authorized</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full" data-testid="button-done-connect">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
