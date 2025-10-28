import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
      toast({
        title: "Login successful!",
        description: "Welcome to The Parlay-Vous Lounge",
      });
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" data-testid="card-login">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Anton, sans-serif' }}>
            THE PARLAY-VOUS LOUNGE
          </CardTitle>
          <CardDescription>
            Sign in to submit your picks and trash talk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player-select">Select Player</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger id="player-select" data-testid="select-player">
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                data-testid="input-password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>

            <p className="text-sm text-muted-foreground text-center mt-4">
              Default password: <span className="font-mono">password</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
