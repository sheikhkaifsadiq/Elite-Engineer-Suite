import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Link2, Link2Off, CheckCircle2, Plus, User, Shield, Zap, ShieldCheck, AtSign, FileText
} from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiX, SiFacebook, SiLinkedin } from "react-icons/si";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ConnectAccountDialog } from "@/components/connect-account-dialog";
import type { ConnectedAccount } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: SiInstagram, color: "text-pink-500" },
  { id: "tiktok", label: "TikTok", icon: SiTiktok, color: "" },
  { id: "youtube", label: "YouTube", icon: SiYoutube, color: "text-red-500" },
  { id: "twitter", label: "X / Twitter", icon: SiX, color: "" },
  { id: "facebook", label: "Facebook", icon: SiFacebook, color: "text-blue-600" },
  { id: "linkedin", label: "LinkedIn", icon: SiLinkedin, color: "text-blue-500" },
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
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["/api/v1/accounts/connected"],
    queryFn: fetchConnectedAccounts,
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.accounts.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/accounts/connected"] });
      toast({ title: "Account disconnected", description: "Your profile changes have been reverted" });
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
    setConnectOpen(true);
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
                    Sign in to your social accounts with full permissions to enable direct publishing
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
                    const isExpanded = expandedAccount === account.id;
                    return (
                      <div key={account.id} data-testid={`account-${account.platform}`}>
                        <div
                          className="flex items-center gap-3 p-3 rounded-md border border-border cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                        >
                          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
                            <span className="text-xs font-bold text-primary-foreground">C</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-3.5 h-3.5 ${platformInfo?.color || ""}`} />
                              <p className="font-medium text-sm">{platformInfo?.label || account.platform}</p>
                              {account.authorized ? (
                                <ShieldCheck className="w-3 h-3 text-green-500" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              )}
                              {account.profileModified && (
                                <Badge variant="secondary" className="text-xs py-0">Profile Modified</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              @{account.modifiedUsername || account.platformUsername}
                              {account.connectedAt && (
                                <span> · Connected {formatDistanceToNow(new Date(account.connectedAt), { addSuffix: true })}</span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive gap-1.5 flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); setDisconnectId(account.id); }}
                            data-testid={`button-disconnect-${account.platform}`}
                          >
                            <Link2Off className="w-3 h-3" />
                            Disconnect
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="ml-12 mt-1 mb-2 p-3 rounded-md border border-border bg-muted/20 space-y-2 text-xs">
                            {account.permissions && account.permissions.length > 0 && (
                              <div>
                                <p className="font-medium mb-1 text-muted-foreground">Permissions Granted:</p>
                                <div className="flex flex-wrap gap-1">
                                  {account.permissions.map((perm: string) => (
                                    <Badge key={perm} variant="outline" className="text-xs py-0">
                                      <ShieldCheck className="w-2.5 h-2.5 mr-1 text-green-500" />
                                      {perm.replace(/_/g, " ")}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {account.originalUsername && (
                              <div className="flex items-center gap-2">
                                <AtSign className="w-3 h-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Original username:</span>
                                <span className="font-medium">@{account.originalUsername}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-medium text-primary">@{account.modifiedUsername}</span>
                              </div>
                            )}
                            {account.modifiedBio && (
                              <div className="flex items-start gap-2">
                                <FileText className="w-3 h-3 text-muted-foreground mt-0.5" />
                                <div>
                                  <span className="text-muted-foreground">Bio: </span>
                                  <span className="font-medium">{account.modifiedBio}</span>
                                </div>
                              </div>
                            )}
                            {account.platformEmail && (
                              <div className="text-muted-foreground">
                                Linked email: {account.platformEmail}
                              </div>
                            )}
                          </div>
                        )}
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
                    Sign in to your social media accounts to enable direct clip publishing
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

      <ConnectAccountDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        platform={selectedPlatform}
      />

      <AlertDialog open={!!disconnectId} onOpenChange={() => setDisconnectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke all permissions and revert your profile changes (username, bio, and profile picture) back to their original state.
              You can reconnect and re-authorize anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectId && disconnectMutation.mutate(disconnectId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-disconnect"
            >
              Disconnect & Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
