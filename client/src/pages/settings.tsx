import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Link2, Link2Off, CheckCircle2, Plus, User, Shield, Zap, Loader2
} from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiX, SiFacebook, SiLinkedin } from "react-icons/si";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ConnectedAccount } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: SiInstagram, color: "text-pink-500", placeholder: "@your_instagram" },
  { id: "tiktok", label: "TikTok", icon: SiTiktok, color: "", placeholder: "@your_tiktok" },
  { id: "youtube", label: "YouTube", icon: SiYoutube, color: "text-red-500", placeholder: "@your_channel" },
  { id: "twitter", label: "X / Twitter", icon: SiX, color: "", placeholder: "@your_handle" },
  { id: "facebook", label: "Facebook", icon: SiFacebook, color: "text-blue-600", placeholder: "Your Page Name" },
  { id: "linkedin", label: "LinkedIn", icon: SiLinkedin, color: "text-blue-500", placeholder: "Your Profile" },
];

async function fetchConnectedAccounts() {
  const res = await api.accounts.list();
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data as ConnectedAccount[];
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<typeof SOCIAL_PLATFORMS[0] | null>(null);
  const [platformUsername, setPlatformUsername] = useState("");
  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["/api/v1/accounts/connected"],
    queryFn: fetchConnectedAccounts,
  });

  const connectMutation = useMutation({
    mutationFn: (data: { platform: string; platformUsername: string }) =>
      api.accounts.connect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/accounts/connected"] });
      toast({ title: "Account connected!", description: `${selectedPlatform?.label} linked successfully` });
      setConnectOpen(false);
      setPlatformUsername("");
    },
    onError: (err: any) => {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.accounts.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/accounts/connected"] });
      toast({ title: "Account disconnected" });
      setDisconnectId(null);
    },
    onError: () => {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    },
  });

  const connectedPlatformIds = (accounts || []).map(a => a.platform);
  const unconnectedPlatforms = SOCIAL_PLATFORMS.filter(p => !connectedPlatformIds.includes(p.id));

  const handleOpenConnect = (platform: typeof SOCIAL_PLATFORMS[0]) => {
    setSelectedPlatform(platform);
    setPlatformUsername("");
    setConnectOpen(true);
  };

  const handleConnect = () => {
    if (!selectedPlatform || !platformUsername.trim()) return;
    connectMutation.mutate({
      platform: selectedPlatform.id,
      platformUsername: platformUsername.trim(),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and connected social platforms</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {user?.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <p className="font-semibold" data-testid="text-username">{user?.username}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-email">{user?.email}</p>
                </div>
                <Badge variant={user?.plan === "pro" ? "default" : "secondary"} className="ml-auto">
                  {user?.plan === "pro" ? "Pro" : "Free"} Plan
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Videos Used</p>
                  <p className="font-medium">{user?.videoCount} {user?.plan === "free" ? "/ 3" : ""}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Auth Provider</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    Email / Password
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Connected Social Accounts
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Connect your social media accounts to export clips directly
                  </CardDescription>
                </div>
                {unconnectedPlatforms.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 flex-shrink-0"
                    onClick={() => handleOpenConnect(unconnectedPlatforms[0])}
                    data-testid="button-add-account"
                  >
                    <Plus className="w-3 h-3" />
                    Connect
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-border">
                      <Skeleton className="h-9 w-9 rounded-md" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : accounts && accounts.length > 0 ? (
                <div className="space-y-2">
                  {accounts.map(account => {
                    const platformInfo = SOCIAL_PLATFORMS.find(p => p.id === account.platform);
                    const Icon = platformInfo?.icon || Link2;
                    return (
                      <div
                        key={account.id}
                        className="flex items-center gap-3 p-3 rounded-md border border-border"
                        data-testid={`account-${account.platform}`}
                      >
                        <div className={`w-9 h-9 rounded-md bg-muted flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${platformInfo?.color || ""}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{platformInfo?.label || account.platform}</p>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {account.platformUsername}
                            {account.connectedAt && (
                              <span> · Connected {formatDistanceToNow(new Date(account.connectedAt), { addSuffix: true })}</span>
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive gap-1.5 flex-shrink-0"
                          onClick={() => setDisconnectId(account.id)}
                          data-testid={`button-disconnect-${account.platform}`}
                        >
                          <Link2Off className="w-3 h-3" />
                          Disconnect
                        </Button>
                      </div>
                    );
                  })}

                  {unconnectedPlatforms.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-xs text-muted-foreground mb-2">Available platforms:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {unconnectedPlatforms.map(p => (
                          <Button
                            key={p.id}
                            variant="outline"
                            size="sm"
                            className="gap-2 justify-start"
                            onClick={() => handleOpenConnect(p)}
                            data-testid={`button-connect-${p.id}`}
                          >
                            <p.icon className={`w-4 h-4 ${p.color}`} />
                            {p.label}
                            <Plus className="w-3 h-3 ml-auto" />
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Link2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-medium text-sm mb-1">No accounts connected</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Connect your social media accounts to export clips directly
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-sm mx-auto">
                    {SOCIAL_PLATFORMS.map(p => (
                      <Button
                        key={p.id}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleOpenConnect(p)}
                        data-testid={`button-connect-${p.id}`}
                      >
                        <p.icon className={`w-4 h-4 ${p.color}`} />
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{user?.plan === "pro" ? "Pro Plan" : "Free Plan"}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.plan === "pro"
                      ? "Unlimited videos, priority processing"
                      : `${user?.videoCount}/3 free videos used this month`}
                  </p>
                </div>
                {user?.plan !== "pro" && (
                  <a href="/pricing">
                    <Button size="sm" className="gap-1.5">
                      <Zap className="w-3 h-3" />
                      Upgrade to Pro
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlatform && <selectedPlatform.icon className={`w-5 h-5 ${selectedPlatform.color}`} />}
              Connect {selectedPlatform?.label}
            </DialogTitle>
            <DialogDescription>
              Link your {selectedPlatform?.label} account to enable direct clip publishing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {unconnectedPlatforms.length > 1 && (
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <div className="grid grid-cols-3 gap-2">
                  {unconnectedPlatforms.map(p => (
                    <Button
                      key={p.id}
                      variant={selectedPlatform?.id === p.id ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => { setSelectedPlatform(p); setPlatformUsername(""); }}
                    >
                      <p.icon className={`w-3.5 h-3.5 ${selectedPlatform?.id === p.id ? "" : p.color}`} />
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="platform-username">Username / Handle</Label>
              <Input
                id="platform-username"
                placeholder={selectedPlatform?.placeholder || "Enter your username"}
                value={platformUsername}
                onChange={e => setPlatformUsername(e.target.value)}
                data-testid="input-platform-username"
              />
              <p className="text-xs text-muted-foreground">
                Enter your {selectedPlatform?.label} username to connect your account
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConnectOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConnect}
              disabled={!platformUsername.trim() || connectMutation.isPending}
              className="gap-2"
              data-testid="button-confirm-connect"
            >
              {connectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : <Link2 className="w-4 h-4" />}
              Connect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!disconnectId} onOpenChange={() => setDisconnectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer be able to export clips directly to this platform. You can reconnect anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectId && disconnectMutation.mutate(disconnectId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-disconnect"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
