import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { name: string; password: string }) => {
      return await apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      toast({ title: "Welcome back!", description: "You're in. Let's get it." });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; password: string }) => {
      return await apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Account created!", description: "Welcome to The Parlay-Vous Lounge." });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Sign up failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure both passwords are the same",
          variant: "destructive",
        });
        return;
      }
      if (password.length < 6) {
        toast({
          title: "Password too short",
          description: "Password must be at least 6 characters",
          variant: "destructive",
        });
        return;
      }
      registerMutation.mutate({ name: username.trim(), password });
    } else {
      loginMutation.mutate({ name: username.trim(), password });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sports-bg">
      {/* Decorative sport emojis floating in background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden select-none" aria-hidden>
        <span className="absolute top-[8%] left-[10%] text-5xl opacity-[0.06]">🏈</span>
        <span className="absolute top-[20%] right-[8%] text-6xl opacity-[0.06]">🏀</span>
        <span className="absolute bottom-[25%] left-[6%] text-5xl opacity-[0.06]">⚾</span>
        <span className="absolute bottom-[10%] right-[12%] text-6xl opacity-[0.06]">🏆</span>
        <span className="absolute top-[50%] left-[3%] text-4xl opacity-[0.05]">💰</span>
        <span className="absolute top-[40%] right-[4%] text-4xl opacity-[0.05]">🔥</span>
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo above card */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-display text-neon-cyan tracking-wide neon-glow-cyan">
            THEBOYZPICK
          </h1>
          <p className="text-neon-cyan/50 text-xs font-display tracking-widest mt-1">
            🏆 PICK · FADE · DOMINATE 🏆
          </p>
        </div>

        <Card className="border-2 border-neon-cyan/30 bg-card/80 backdrop-blur-sm" data-testid="card-login">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-display tracking-wide text-foreground">
              THE PARLAY-VOUS LOUNGE
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {mode === "login" ? "Sign in to submit your picks and trash talk" : "Create your account to join the action"}
            </CardDescription>

            {/* Mode toggle tabs */}
            <div className="flex mt-3 rounded-md overflow-hidden border border-neon-cyan/20">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 py-2 text-xs font-display tracking-widest transition-colors ${
                  mode === "login"
                    ? "bg-neon-cyan text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 py-2 text-xs font-display tracking-widest transition-colors ${
                  mode === "signup"
                    ? "bg-neon-cyan text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                SIGN UP
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  data-testid="input-username"
                  autoComplete="username"
                  className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Create a password (min 6 chars)" : "Enter your password"}
                  data-testid="input-password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20"
                />
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    data-testid="input-confirm-password"
                    autoComplete="new-password"
                    className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-neon-cyan text-background hover:bg-neon-cyan/90 font-display tracking-widest text-sm"
                disabled={isPending}
                data-testid="button-login"
              >
                {isPending
                  ? mode === "signup" ? "CREATING ACCOUNT..." : "LOGGING IN..."
                  : mode === "signup" ? "CREATE ACCOUNT" : "LET'S GET IT"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
