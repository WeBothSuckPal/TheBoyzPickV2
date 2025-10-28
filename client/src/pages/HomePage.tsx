import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import PlayerCard from "@/components/PlayerCard";
import PickCard from "@/components/PickCard";
import ConsensusBar from "@/components/ConsensusBar";
import PickSubmissionDialog from "@/components/PickSubmissionDialog";
import ChatBox from "@/components/ChatBox";
import AdminPanel from "@/components/AdminPanel";
import AdminPasswordDialog from "@/components/AdminPasswordDialog";
import { Separator } from "@/components/ui/separator";
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

export default function HomePage() {
  const [currentPlayer, setCurrentPlayer] = useState("Carter");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    connectWebSocket();
  }, []);

  const { data: authStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  useEffect(() => {
    if (authStatus?.isAuthenticated) {
      setIsAdminAuthenticated(true);
    }
  }, [authStatus]);

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

  const resolvePickMutation = useMutation({
    mutationFn: async ({ pickId, status }: { pickId: string; status: "win" | "loss" }) => {
      return await apiRequest("POST", `/api/picks/${pickId}/resolve`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Pick resolved!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resolve pick",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fetchGamesMutation = useMutation({
    mutationFn: async (sportKey: string) => {
      if (!activeWeek?.id) throw new Error("No active week found");
      return await apiRequest("POST", "/api/admin/fetch-games", { weekId: activeWeek.id, sportKey });
    },
    onSuccess: (data) => {
      toast({ 
        title: "Games fetched successfully!", 
        description: `Loaded ${data.count} ${data.sport || ''} games from The Odds API`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to fetch games",
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

  const currentPlayerData = players.find((p) => p.name === currentPlayer);
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
    if (!currentPlayerData) {
      toast({
        title: "Please select a player first",
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
    if (!currentPlayerData) {
      toast({
        title: "Please select a player first",
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
          <h1 className="text-4xl md:text-6xl font-display text-center text-neon-cyan neon-glow-cyan mb-2 tracking-wide">
            DABOYZPICK
          </h1>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center text-muted-foreground text-sm md:text-base">
            <p>
              Week {activeWeek?.weekNumber || "..."}
            </p>
            <div className="flex items-center gap-2">
              <span>Playing as:</span>
              <select
                value={currentPlayer}
                onChange={(e) => setCurrentPlayer(e.target.value)}
                className="bg-card border border-neon-cyan text-neon-cyan px-3 py-1 rounded-md font-medium"
                data-testid="select-current-player"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-12">
        <section data-testid="section-leaderboard">
          <h2 className="text-3xl font-display text-neon-magenta neon-glow-magenta mb-6">
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
            <h2 className="text-3xl font-display text-neon-cyan neon-glow-cyan">
              THIS WEEK'S PICKS
            </h2>
            <PickSubmissionDialog onSubmit={handleSubmitPicks} weekId={activeWeek?.id} />
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
                canFade={pick.playerName !== currentPlayer && pick.status === "pending"}
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
          <h2 className="text-3xl font-display text-neon-magenta neon-glow-magenta mb-6">
            THE LOCKER ROOM
          </h2>
          <div className="max-w-3xl">
            <ChatBox
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              currentUser={currentPlayer}
            />
          </div>
        </section>

        <Separator className="bg-border" />

        <section data-testid="section-admin">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-display text-destructive">
              ADMIN PANEL
            </h2>
            <button
              onClick={() => {
                if (isAdminAuthenticated) {
                  setShowAdmin(!showAdmin);
                } else {
                  setShowPasswordDialog(true);
                }
              }}
              className="text-sm text-muted-foreground hover:text-foreground font-medium"
              data-testid="button-toggle-admin"
            >
              {isAdminAuthenticated && showAdmin ? "Hide" : "Show"}
            </button>
          </div>
          {isAdminAuthenticated && showAdmin && (
            <AdminPanel
              pendingPicks={pendingPicks.map((p) => ({
                ...p,
                isFaded: p.isFaded || false,
                fadedBy: p.fadedBy || [],
              }))}
              onResolveWin={(id) => resolvePickMutation.mutate({ pickId: id, status: "win" })}
              onResolveLoss={(id) => resolvePickMutation.mutate({ pickId: id, status: "loss" })}
              onFetchGames={() => fetchGamesMutation.mutate()}
              isFetchingGames={fetchGamesMutation.isPending}
            />
          )}
        </section>
      </main>

      <AdminPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setShowAdmin(true);
          toast({ title: "Admin access granted" });
        }}
      />

      <footer className="border-t border-border py-6 px-4 md:px-8 mt-12">
        <p className="text-center text-sm text-muted-foreground">
          DaBoyzPick • Go Buckeyes!
        </p>
      </footer>
    </div>
  );
}
