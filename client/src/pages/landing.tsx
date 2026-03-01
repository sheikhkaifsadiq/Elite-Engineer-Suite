import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Scissors, Zap, BarChart2, Clock, Download, Star,
  ArrowRight, CheckCircle, Play, Wand2, Film, TrendingUp
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const features = [
  {
    icon: Wand2,
    title: "AI-Powered Clipping",
    description: "Our AI automatically detects the most engaging moments in your long-form content and creates perfectly timed short clips.",
  },
  {
    icon: Film,
    title: "Auto 9:16 Cropping",
    description: "Every clip is automatically cropped and formatted for TikTok, Instagram Reels, and YouTube Shorts — no manual editing needed.",
  },
  {
    icon: BarChart2,
    title: "Virality Scoring",
    description: "Each clip receives an AI-computed virality score based on emotion, keywords, pacing, and engagement potential.",
  },
  {
    icon: Scissors,
    title: "Auto Subtitles",
    description: "Dynamic captions generated from our Whisper-powered transcription engine with word-by-word animation support.",
  },
  {
    icon: TrendingUp,
    title: "Title & Hashtag AI",
    description: "AI generates platform-optimized titles, descriptions, and hashtags for each clip automatically.",
  },
  {
    icon: Zap,
    title: "Background Processing",
    description: "Upload and walk away. Our async job queue processes your video while you continue working.",
  },
];

const steps = [
  { num: "01", title: "Upload Your Video", desc: "Drag and drop any MP4, MOV, or MKV file up to 2GB" },
  { num: "02", title: "AI Processing", desc: "Our engine transcribes, analyzes, and scores every moment" },
  { num: "03", title: "Review Clips", desc: "Browse AI-generated clips with virality scores and transcripts" },
  { num: "04", title: "Download & Publish", desc: "Export vertical 9:16 clips ready for any social platform" },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm tracking-tight">Clipora.ai</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground">How It Works</a>
            <Link href="/pricing" className="text-sm text-muted-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" data-testid="button-go-to-dashboard">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="ghost" data-testid="button-login-nav">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" data-testid="button-register-nav">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <Star className="w-3 h-3" />
            AI-Powered Video Repurposing
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Turn Long Videos Into
            <br />
            <span className="text-primary">Viral Short Clips</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Clipora.ai uses AI to automatically transcribe, score, and clip your content into
            vertical 9:16 shorts with captions — ready for TikTok, Reels, and Shorts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href={user ? "/upload" : "/register"}>
              <Button size="lg" className="gap-2" data-testid="button-hero-cta">
                Start for Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="gap-2">
                <Play className="w-4 h-4" />
                See How It Works
              </Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required · 3 free videos/month</p>

          <div className="mt-14 relative mx-auto max-w-3xl rounded-lg overflow-hidden border border-border bg-card shadow-lg">
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted/50 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-muted-foreground font-mono">clipora.ai/dashboard</span>
            </div>
            <div className="bg-card p-6 min-h-40 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
                {[92, 78, 85].map((score, i) => (
                  <div key={i} className="rounded-md bg-muted/60 p-3 space-y-2 border border-border">
                    <div className="h-16 rounded bg-primary/15 flex items-center justify-center">
                      <Film className="w-6 h-6 text-primary/40" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded bg-muted-foreground/20 w-3/4" />
                      <div className="h-2 rounded bg-muted-foreground/10 w-1/2" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Score</span>
                      <Badge variant="secondary" className="text-xs font-bold text-green-600 dark:text-green-400">
                        {score}/100
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything you need to go viral</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              From upload to publish-ready clips in minutes, powered by open-source AI.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="p-5 rounded-lg border border-border bg-card space-y-3 hover-elevate">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-4.5 h-4.5 text-primary w-[18px] h-[18px]" />
                </div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">From raw footage to viral clips in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-4 p-5 rounded-lg border border-border bg-card">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm font-mono">{step.num}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start clipping?</h2>
          <p className="text-muted-foreground mb-8">
            Join creators who are growing their audience with AI-generated short clips.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href={user ? "/upload" : "/register"}>
              <Button size="lg" className="gap-2" data-testid="button-footer-cta">
                Get Started for Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">View Pricing</Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {["3 free videos/month", "No credit card", "Cancel anytime"].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Scissors className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Clipora.ai</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built with open-source AI · Whisper · FFmpeg · React
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
