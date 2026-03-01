import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Upload, Scissors, CreditCard, LogOut, Zap, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Upload Video", url: "/upload", icon: Upload },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Pricing", url: "/pricing", icon: CreditCard },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm text-sidebar-foreground tracking-tight">Clipora.ai</p>
              <p className="text-xs text-muted-foreground">Video Repurposing</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Plan</SidebarGroupLabel>
            <SidebarGroupContent className="px-2 pb-2">
              <div className="rounded-md bg-sidebar-accent p-3 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-sidebar-foreground font-medium">
                    {user.plan === "pro" ? "Pro Plan" : "Free Plan"}
                  </span>
                  <Badge variant={user.plan === "pro" ? "default" : "secondary"} className="text-xs">
                    {user.plan === "pro" ? "PRO" : "FREE"}
                  </Badge>
                </div>
                {user.plan === "free" && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Videos used</span>
                      <span>{user.videoCount}/3</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-sidebar-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min((user.videoCount / 3) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {user.plan === "free" && (
                  <Link href="/pricing">
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer mt-1">
                      <Zap className="w-3 h-3" />
                      Upgrade to Pro
                    </div>
                  </Link>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {user && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-1 py-1.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-sidebar-foreground">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  data-testid="button-logout"
                  className="text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
