import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Password strength helper ───────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair",   color: "bg-yellow-400" };
  if (score <= 3) return { score, label: "Good",   color: "bg-blue-400" };
  return             { score, label: "Strong", color: "bg-green-500" };
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Sign-in fields
  const [identifier, setIdentifier] = useState("");      // email OR username

  // Sign-up fields
  const [username, setUsername]         = useState("");
  const [email, setEmail]               = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const strength = getPasswordStrength(password);

  // ── Mutations ────────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: async (creds: { identifier: string; password: string }) =>
      await apiRequest("POST", "/api/auth/login", creds),
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
    mutationFn: async (data: { name: string; email: string; password: string }) =>
      await apiRequest("POST", "/api/auth/register", data),
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

  // ── Submit handler ───────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      if (!identifier.trim() || !password) {
        toast({ title: "Missing info", description: "Please fill in all fields", variant: "destructive" });
        return;
      }
      loginMutation.mutate({ identifier: identifier.trim(), password });
      return;
    }

    // ── Sign-up validation ───────────────────────────────────────────────
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      toast({ title: "Missing info", description: "All fields are required", variant: "destructive" });
      return;
    }
    if (username.trim().length < 2) {
      toast({ title: "Username too short", description: "Must be at least 2 characters", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please re-enter your password", variant: "destructive" });
      return;
    }

    registerMutation.mutate({ name: username.trim(), email: email.trim().toLowerCase(), password });
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setIdentifier(""); setUsername(""); setEmail(""); setPassword(""); setConfirmPassword("");
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sports-bg">
      {/* Decorative sport emojis */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden select-none" aria-hidden>
        <span className="absolute top-[8%]  left-[10%]  text-5xl opacity-[0.06]">🏈</span>
        <span className="absolute top-[20%] right-[8%]  text-6xl opacity-[0.06]">🏀</span>
        <span className="absolute bottom-[25%] left-[6%] text-5xl opacity-[0.06]">⚾</span>
        <span className="absolute bottom-[10%] right-[12%] text-6xl opacity-[0.06]">🏆</span>
        <span className="absolute top-[50%]  left-[3%]  text-4xl opacity-[0.05]">💰</span>
        <span className="absolute top-[40%]  right-[4%] text-4xl opacity-[0.05]">🔥</span>
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
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
              {mode === "login"
                ? "Sign in to submit your picks and trash talk"
                : "Create your account to join the action"}
            </CardDescription>

            {/* Mode tabs */}
            <div className="flex mt-3 rounded-md overflow-hidden border border-neon-cyan/20">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 py-2 text-xs font-display tracking-widest transition-colors ${
                  mode === "login" ? "bg-neon-cyan text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 py-2 text-xs font-display tracking-widest transition-colors ${
                  mode === "signup" ? "bg-neon-cyan text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                SIGN UP
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* ── SIGN IN fields ── */}
              {mode === "login" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                      Email or Username
                    </Label>
                    <Input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="your@email.com or username"
                      data-testid="input-identifier"
                      autoComplete="username"
                      className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-login" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password-login"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        data-testid="input-password"
                        autoComplete="current-password"
                        className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20 pr-16"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ── SIGN UP fields ── */}
              {mode === "signup" && (
                <>
                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                      Username <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a display name"
                      data-testid="input-username"
                      autoComplete="username"
                      maxLength={30}
                      className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20"
                    />
                    <p className="text-xs text-muted-foreground">
                      This is how you'll appear to other players. 2–30 characters.
                    </p>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                      Email Address <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      data-testid="input-email"
                      autoComplete="email"
                      className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to log in and recover your account. Never shared.
                    </p>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password-signup" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                      Password <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password-signup"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        data-testid="input-password"
                        autoComplete="new-password"
                        className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20 pr-16"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>

                    {/* Strength meter */}
                    {password && (
                      <div className="space-y-1">
                        <div className="flex gap-1 h-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-full transition-colors ${
                                strength.score >= i ? strength.color : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Strength:{" "}
                          <span className={
                            strength.label === "Weak"   ? "text-red-400"   :
                            strength.label === "Fair"   ? "text-yellow-400" :
                            strength.label === "Good"   ? "text-blue-400"  :
                            "text-green-400"
                          }>
                            {strength.label}
                          </span>
                          {" "}— use uppercase, numbers &amp; symbols for a stronger password.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                      Confirm Password <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      data-testid="input-confirm-password"
                      autoComplete="new-password"
                      className={`border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20 ${
                        confirmPassword && confirmPassword !== password ? "border-red-500" : ""
                      }`}
                    />
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-400">Passwords do not match</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Fields marked <span className="text-red-400">*</span> are required.
                  </p>
                </>
              )}

              <Button
                type="submit"
                className="w-full bg-neon-cyan text-background hover:bg-neon-cyan/90 font-display tracking-widest text-sm"
                disabled={isPending}
                data-testid="button-login"
              >
                {isPending
                  ? (mode === "signup" ? "CREATING ACCOUNT..." : "LOGGING IN...")
                  : (mode === "signup" ? "CREATE ACCOUNT" : "LET'S GET IT")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
