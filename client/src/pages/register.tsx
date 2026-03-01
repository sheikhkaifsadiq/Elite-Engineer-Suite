import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors, Loader2, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { SocialLoginButtons } from "@/components/social-login-buttons";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { refresh } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", username: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await api.auth.register({
        email: values.email,
        username: values.username,
        password: values.password,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Registration failed");
      await refresh();
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-4 h-14 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm tracking-tight">Clipora.ai</span>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-muted-foreground">Start with 3 free video clips per month</p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
            {["3 free videos", "No credit card", "Cancel anytime"].map(t => (
              <span key={t} className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-primary" />
                {t}
              </span>
            ))}
          </div>

          <Card>
            <CardContent className="pt-5 space-y-4">
              <SocialLoginButtons mode="register" />
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="coolcreator"
                            data-testid="input-username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Min 8 characters"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Repeat your password"
                            data-testid="input-confirm-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                    data-testid="button-register-submit"
                  >
                    {form.formState.isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account…</>
                    ) : "Create Free Account"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
