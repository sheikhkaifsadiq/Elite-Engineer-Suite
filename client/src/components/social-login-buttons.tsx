import { Button } from "@/components/ui/button";
import { SiGoogle, SiFacebook, SiGithub, SiApple } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

interface SocialLoginButtonsProps {
  mode: "login" | "register";
}

const providers = [
  { id: "google", label: "Google", icon: SiGoogle, color: "text-red-500" },
  { id: "facebook", label: "Facebook", icon: SiFacebook, color: "text-blue-600" },
  { id: "github", label: "GitHub", icon: SiGithub, color: "" },
  { id: "apple", label: "Apple", icon: SiApple, color: "" },
];

export function SocialLoginButtons({ mode }: SocialLoginButtonsProps) {
  const { toast } = useToast();

  const handleSocialLogin = (provider: string) => {
    toast({
      title: `${provider} sign-in coming soon`,
      description: `OAuth integration with ${provider} requires API credentials to be configured. Use email/password for now.`,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {providers.map((p) => (
          <Button
            key={p.id}
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleSocialLogin(p.label)}
            data-testid={`button-social-${p.id}`}
          >
            <p.icon className={`w-4 h-4 ${p.color}`} />
            {p.label}
          </Button>
        ))}
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground">
            or {mode === "login" ? "sign in" : "sign up"} with email
          </span>
        </div>
      </div>
    </div>
  );
}
