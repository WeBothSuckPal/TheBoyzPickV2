import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Player {
  id: string;
  name: string;
  chips: number;
  avatar: string;
}

export default function LoginPage() {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

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
      toast({
        title: "Login successful!",
        description: "Welcome to The Parlay-Vous Lounge",
      });
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !password) {
      toast({
        title: "Missing information",
        description: "Please select a player and enter your password",
        variant: "destructive",
      });
      return;
    }

    const player = players.find(p => p.id === selectedPlayer);
    if (player) {
      loginMutation.mutate({ name: player.name, password });
    }
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
              Sign in to submit your picks and trash talk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="player-select" className="text-xs font-display tracking-widest text-muted-foreground uppercase">
                  Select Player
                </Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger id="player-select" data-testid="select-player" className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20">
                    <SelectValue placeholder="Choose your player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem
                        key={player.id}
                        value={player.id}
                        data-testid={`option-player-${player.name.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        {player.name} ({player.chips} chips)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  placeholder="Enter your password"
                  data-testid="input-password"
                  className="border-neon-cyan/30 focus:border-neon-cyan focus:ring-neon-cyan/20"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-neon-cyan text-background hover:bg-neon-cyan/90 font-display tracking-widest text-sm"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "LOGGING IN..." : "LET'S GET IT"}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Default password: <span className="font-mono text-neon-cyan/70">password</span>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
