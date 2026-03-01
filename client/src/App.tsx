import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import UploadPage from "@/pages/upload";
import VideoDetailPage from "@/pages/video-detail";
import PricingPage from "@/pages/pricing";
import SettingsPage from "@/pages/settings";

const AUTH_ROUTES = ["/dashboard", "/upload", "/settings"];
const VIDEO_ROUTES_PATTERN = /^\/video\//;

function AppLayout() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  const isAppRoute = AUTH_ROUTES.includes(location) || VIDEO_ROUTES_PATTERN.test(location);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading Clipora…</p>
        </div>
      </div>
    );
  }

  if (isAppRoute && !user) {
    return <Redirect to="/login" />;
  }

  if (isAppRoute && user) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <header className="flex items-center justify-between px-3 py-2 border-b border-border h-12 flex-shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-hidden">
              <Switch>
                <Route path="/dashboard" component={DashboardPage} />
                <Route path="/upload" component={UploadPage} />
                <Route path="/video/:id" component={VideoDetailPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppLayout />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
