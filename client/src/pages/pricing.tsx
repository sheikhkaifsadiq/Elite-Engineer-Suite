import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Zap, Star, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/theme-toggle";
import { Scissors } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for creators just getting started",
    icon: Star,
    badge: null,
    features: [
      "3 videos per month",
      "AI transcription (Whisper)",
      "Automatic highlight detection",
      "Virality scoring",
      "9:16 auto-crop",
      "Download clips",
      "Basic AI titles & hashtags",
    ],
    cta: "Get Started",
    ctaVariant: "outline" as const,
    href: "/register",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "per month",
    description: "For serious creators who publish daily",
    icon: Zap,
    badge: "Most Popular",
    features: [
      "Unlimited videos",
      "Priority processing queue",
      "AI transcription (Whisper)",
      "Advanced highlight detection",
      "Virality scoring engine",
      "9:16 auto-crop + face tracking",
      "Animated captions & subtitles",
      "AI titles, descriptions & hashtags",
      "Batch processing",
      "Priority support",
    ],
    cta: "Start Pro",
    ctaVariant: "default" as const,
    href: "/register",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "White-label solutions for agencies and teams",
    icon: Building2,
    badge: null,
    features: [
      "Everything in Pro",
      "API access",
      "White-label license",
      "Custom AI model training",
      "Dedicated processing servers",
      "SLA guarantee",
      "Custom integrations",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    href: "/register",
  },
];

export default function PricingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href={user ? "/dashboard" : "/"}>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Scissors className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm tracking-tight">Clipora.ai</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" data-testid="button-go-to-dashboard">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="ghost">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12 space-y-3">
          <Badge variant="secondary" className="gap-1.5">
            <Zap className="w-3 h-3" />
            Simple Pricing
          </Badge>
          <h1 className="text-3xl font-bold">Choose your plan</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start free. Upgrade when you're ready to create without limits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isCurrentPlan = user?.plan === plan.id;
            const isPro = plan.id === "pro";

            return (
              <Card
                key={plan.id}
                className={`relative ${isPro ? "border-primary ring-1 ring-primary" : ""}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="shadow-sm">{plan.badge}</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center ${isPro ? "bg-primary" : "bg-muted"}`}>
                      <plan.icon className={`w-4.5 h-4.5 w-[18px] h-[18px] ${isPro ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </div>
                    {isCurrentPlan && <Badge variant="secondary" className="text-xs">Current Plan</Badge>}
                  </div>
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground mb-0.5">/{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isPro ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={isPro ? "" : "text-muted-foreground"}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={isCurrentPlan ? "/dashboard" : plan.href}>
                    <Button
                      variant={isCurrentPlan ? "secondary" : plan.ctaVariant}
                      className="w-full gap-2 mt-2"
                      data-testid={`button-plan-cta-${plan.id}`}
                    >
                      {isCurrentPlan ? "View Dashboard" : plan.cta}
                      {!isCurrentPlan && <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">All plans include AI transcription, highlight detection, and clip generation.</p>
          <p className="text-xs text-muted-foreground">No credit card required to start. Cancel or upgrade anytime.</p>
        </div>

        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { q: "What video formats are supported?", a: "We support MP4, MOV, MKV, AVI, and WebM files up to 2GB in size." },
              { q: "How long does processing take?", a: "Most videos are processed within 2-5 minutes depending on length and quality." },
              { q: "What AI models power Clipora?", a: "We use OpenAI's Whisper for transcription and custom NLP for highlight detection and virality scoring." },
              { q: "Can I edit the generated clips?", a: "Yes! You can edit clip titles, descriptions, and timing after AI generation." },
            ].map(({ q, a }) => (
              <div key={q} className="space-y-1">
                <p className="text-sm font-medium">{q}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
