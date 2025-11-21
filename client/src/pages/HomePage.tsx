import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import PlayerCard from "@/components/PlayerCard";
import PickCard from "@/components/PickCard";
import ConsensusBar from "@/components/ConsensusBar";
import PickSubmissionDialog from "@/components/PickSubmissionDialog";
import ChatBox from "@/components/ChatBox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { connectWebSocket } from "@/lib/websocket";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
  chips: number;
  avatar: string;
}

interface Week {
  id: string;
  weekNumber: number;
  isActive: boolean;
}

interface Pick {
  id: string;
  weekId: string;
  playerId: string;
  pickType: "LOCK" | "SIDE" | "LOTTO";
  pick: string;
  chips: number;
  status: "pending" | "win" | "loss";
  playerName: string;
  isFaded: boolean;
  fadedBy: string[];
  sportKey?: string | null;
}

interface ChatMessageData {
  id: string;
  playerId: string;
  message: string;
  playerName: string;
  createdAt: string;
}

interface PlayerAuthStatus {
  isAuthenticated: boolean;
  player?: {
    id: string;
    name: string;
    chips: number;
    avatar: string;
  };
}

export default function HomePage() {
  const [currentPlayer, setCurrentPlayer] = useState("Carter");
  const { toast } = useToast();

  useEffect(() => {
    connectWebSocket();
  }, []);

  const { data: playerAuthStatus } = useQuery<PlayerAuthStatus>({
    queryKey: ["/api/auth/status"],
  });

  const { data: authStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const { data: players = [], refetch: refetchPlayers } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: activeWeek } = useQuery<Week>({
    queryKey: ["/api/weeks/active"],
  });

  const { data: picks = [], refetch: refetchPicks } = useQuery<Pick[]>({
    queryKey: ["/api/picks", activeWeek?.id],
    enabled: !!activeWeek?.id,
    queryFn: async () => {
      const response = await fetch(`/api/picks?weekId=${activeWeek!.id}`);
      if (!response.ok) throw new Error("Failed to fetch picks");
      return response.json();
    },
  });

  const { data: chatMessagesData = [], refetch: refetchChat } = useQuery<ChatMessageData[]>({
    queryKey: ["/api/chat/messages"],
  });

  const chatMessages = chatMessagesData.map((msg) => ({
    id: msg.id,
    user: msg.playerName,
    message: msg.message,
    timestamp: new Date(msg.createdAt),
  }));

  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === "picks_submitted") {
      refetchPicks();
      toast({ title: "New picks submitted!" });
    } else if (data.type === "fade_created") {
      refetchPicks();
      refetchPlayers();
      toast({ title: "A pick has been faded!" });
    } else if (data.type === "pick_resolved") {
      refetchPicks();
      refetchPlayers();
      toast({ title: "Pick resolved!" });
    } else if (data.type === "chat_message") {
      refetchChat();
    }
  }, [refetchPicks, refetchPlayers, refetchChat, toast]);

  useWebSocket(handleWebSocketMessage);

  const submitPicksMutation = useMutation({
    mutationFn: async (data: { playerId: string; lock: string; side: string; lotto: string; lockGameId: string; sideGameId: string; lottoGameId: string }) => {
      return await apiRequest("POST", "/api/picks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picks"] });
      toast({ title: "Picks submitted successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit picks",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fadeMutation = useMutation({
    mutationFn: async (data: { playerId: string; targetPickId: string }) => {
      return await apiRequest("POST", "/api/fades", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Fade successful!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to fade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { playerId: string; message: string }) => {
      return await apiRequest("POST", "/api/chat/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      toast({ title: "Logged out successfully" });
    },
  });

  const currentPlayerData = playerAuthStatus?.isAuthenticated && playerAuthStatus.player
    ? players.find((p) => p.id === playerAuthStatus.player!.id)
    : players.find((p) => p.name === currentPlayer);
  const sortedPlayers = [...players].sort((a, b) => b.chips - a.chips);

  const lockPicks = picks.filter((p) => p.pickType === "LOCK");
  const pickCounts: Record<string, Set<string>> = {};
  lockPicks.forEach((pick) => {
    if (!pickCounts[pick.pick]) {
      pickCounts[pick.pick] = new Set();
    }
    pickCounts[pick.pick].add(pick.playerId);
  });
  const hasConsensus = Object.values(pickCounts).some((players) => players.size >= 3);

  const handleSubmitPicks = (picksData: any) => {
    if (!playerAuthStatus?.isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to submit picks",
        variant: "destructive",
      });
      return;
    }

    if (!currentPlayerData) {
      toast({
        title: "Player not found",
        variant: "destructive",
      });
      return;
    }

    submitPicksMutation.mutate({
      playerId: currentPlayerData.id,
      lock: picksData.lock,
      side: picksData.side,
      lotto: picksData.lotto,
      lockGameId: picksData.lockGameId,
      sideGameId: picksData.sideGameId,
      lottoGameId: picksData.lottoGameId,
    });
  };

  const handleFade = (pickId: string) => {
    if (!playerAuthStatus?.isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to fade picks",
        variant: "destructive",
      });
      return;
    }

    if (!currentPlayerData) {
      toast({
        title: "Player not found",
        variant: "destructive",
      });
      return;
    }

    fadeMutation.mutate({
      playerId: currentPlayerData.id,
      targetPickId: pickId,
    });
  };

  const handleSendMessage = (message: string, _user: string) => {
    if (!playerAuthStatus?.isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to send messages",
        variant: "destructive",
      });
      return;
    }

    if (!currentPlayerData) return;

    sendMessageMutation.mutate({
      playerId: currentPlayerData.id,
      message,
    });
  };

  const pendingPicks = picks.filter((p) => p.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-neon-cyan py-6 px-4 md:px-8 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl md:text-6xl font-display text-center text-neon-cyan tracking-wide">
                THEBOYZPICK
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {playerAuthStatus?.isAuthenticated && playerAuthStatus.player ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Playing as:</span>
                    <span className="text-neon-cyan font-medium" data-testid="text-logged-in-player">
                      {playerAuthStatus.player.name}
                    </span>
                  </div>
                  {authStatus?.isAuthenticated && (
                    <Link href="/admin">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        data-testid="button-admin-link"
                      >
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10"
                    data-testid="button-logout"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-neon-cyan text-background hover:bg-neon-cyan/90 font-medium"
                    data-testid="button-login-link"
                  >
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <p className="text-center text-muted-foreground text-sm md:text-base">
            Week {activeWeek?.weekNumber || "..."} Slate
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-12">
        <section data-testid="section-leaderboard">
          <h2 className="text-3xl font-display text-neon-magenta mb-6">
            CHIP COUNT LEADERBOARD
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedPlayers.map((player, idx) => (
              <PlayerCard
                key={player.id}
                name={player.name}
                chips={player.chips}
                avatar={player.avatar as any}
                rank={(idx + 1) as 1 | 2 | 3 | 4}
                isFirst={idx === 0}
                isLast={idx === sortedPlayers.length - 1}
              />
            ))}
          </div>
        </section>

        <Separator className="bg-border" />

        <section data-testid="section-picks">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-3xl font-display text-neon-cyan">
              THIS WEEK'S PICKS
            </h2>
            <PickSubmissionDialog 
              onSubmit={handleSubmitPicks} 
              weekId={activeWeek?.id}
              isAuthenticated={playerAuthStatus?.isAuthenticated || false}
            />
          </div>

          {hasConsensus && <ConsensusBar />}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.map((pick) => (
              <PickCard
                key={pick.id}
                playerName={pick.playerName}
                pickType={pick.pickType}
                pick={pick.pick}
                chips={pick.chips}
                status={pick.status}
                isFaded={pick.isFaded}
                fadedBy={pick.fadedBy}
                sportKey={pick.sportKey || undefined}
                canFade={playerAuthStatus?.isAuthenticated && pick.playerName !== currentPlayer && pick.status === "pending"}
                isOwnPick={pick.playerName === currentPlayer}
                onFade={() => handleFade(pick.id)}
              />
            ))}
          </div>

          {picks.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No picks submitted yet. Be the first to lock in your picks!
            </p>
          )}
        </section>

        <Separator className="bg-border" />

        <section data-testid="section-chat">
          <h2 className="text-3xl font-display text-neon-magenta mb-6">
            THE LOCKER ROOM
          </h2>
          <div className="max-w-3xl">
            <ChatBox
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              currentUser={currentPlayer}
              disabled={!playerAuthStatus?.isAuthenticated}
            />
          </div>
        </section>

      </main>

      <footer className="border-t border-border py-6 px-4 md:px-8 mt-12">
        <p className="text-center text-sm text-muted-foreground">
          TheBoyzPick • Go Buckeyes!
        </p>
      </footer>
    </div>
  );
}
