import { useEffect, useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import PlayerCard from "@/components/PlayerCard";
import PickCard from "@/components/PickCard";
import ConsensusBar from "@/components/ConsensusBar";
import PickSubmissionDialog from "@/components/PickSubmissionDialog";
import ChatBox from "@/components/ChatBox";
import CountdownTimer from "@/components/CountdownTimer";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { connectWebSocket } from "@/lib/websocket";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { requestNotificationPermission, sendNotification } from "@/lib/notifications";

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

interface Game {
  id: string;
  commenceTime: string;
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
  const { toast } = useToast();
  // Feature 3: selected week for history viewing
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  useEffect(() => {
    connectWebSocket();
  }, []);

  // Feature 4: request notification permission after first load
  useEffect(() => {
    requestNotificationPermission();
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

  // Feature 3: all weeks for the season history selector
  const { data: allWeeks = [] } = useQuery<Week[]>({
    queryKey: ["/api/weeks"],
  });

  // The week whose picks we're currently viewing (defaults to active)
  const viewingWeekId = selectedWeekId ?? activeWeek?.id;
  const viewingWeek = selectedWeekId
    ? allWeeks.find(w => w.id === selectedWeekId)
    : activeWeek;
  const isViewingCurrentWeek = !selectedWeekId || selectedWeekId === activeWeek?.id;

  const { data: picks = [], refetch: refetchPicks } = useQuery<Pick[]>({
    queryKey: ["/api/picks", viewingWeekId],
    enabled: !!viewingWeekId,
    queryFn: async () => {
      const response = await fetch(`/api/picks?weekId=${viewingWeekId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch picks");
      return response.json();
    },
  });

  // Feature 2: games for countdown timer (active week only)
  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/games", activeWeek?.id],
    enabled: !!activeWeek?.id && isViewingCurrentWeek,
    queryFn: async () => {
      const response = await fetch(`/api/games?weekId=${activeWeek!.id}`, { credentials: "include" });
      if (!response.ok) return [];
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

  // Feature 2: earliest game start time for countdown
  const earliestGameTime =
    games.length > 0
      ? new Date(
          Math.min(...games.map((g) => new Date(g.commenceTime).getTime()))
        )
      : null;
  const pickWindowOpen = earliestGameTime ? earliestGameTime > new Date() : true;

  const handleWebSocketMessage = useCallback(
    (data: any) => {
      if (data.type === "picks_submitted") {
        refetchPicks();
        // Feature 4: push notification
        sendNotification("New Picks!", "Someone just locked in their picks.");
        toast({ title: "New picks submitted!" });
      } else if (data.type === "fade_created") {
        refetchPicks();
        refetchPlayers();
        sendNotification("Fade Alert!", "Someone just faded a LOCK pick.");
        toast({ title: "A pick has been faded!" });
      } else if (data.type === "pick_resolved") {
        refetchPicks();
        refetchPlayers();
        sendNotification("Pick Resolved!", "A pick result has been updated.");
        toast({ title: "Pick resolved!" });
      } else if (data.type === "chat_message") {
        refetchChat();
      }
    },
    [refetchPicks, refetchPlayers, refetchChat, toast]
  );

  useWebSocket(handleWebSocketMessage);

  const submitPicksMutation = useMutation({
    mutationFn: async (data: {
      playerId: string;
      lock: string;
      side: string;
      lotto: string;
      lockGameId: string;
      sideGameId: string;
      lottoGameId: string;
    }) => {
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

  const currentPlayerName = playerAuthStatus?.player?.name ?? "";
  const currentPlayerData =
    playerAuthStatus?.isAuthenticated && playerAuthStatus.player
      ? players.find((p) => p.id === playerAuthStatus.player!.id)
      : undefined;
  const sortedPlayers = [...players].sort((a, b) => b.chips - a.chips);

  const lockPicks = picks.filter((p) => p.pickType === "LOCK");
  const pickCounts: Record<string, Set<string>> = {};
  lockPicks.forEach((pick) => {
    if (!pickCounts[pick.pick]) pickCounts[pick.pick] = new Set();
    pickCounts[pick.pick].add(pick.playerId);
  });
  const hasConsensus = Object.values(pickCounts).some((ps) => ps.size >= 3);

  const handleSubmitPicks = (picksData: any) => {
    if (!playerAuthStatus?.isAuthenticated) {
      toast({ title: "Login required", description: "Please login to submit picks", variant: "destructive" });
      return;
    }
    if (!currentPlayerData) {
      toast({ title: "Player not found", variant: "destructive" });
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
      toast({ title: "Login required", description: "Please login to fade picks", variant: "destructive" });
      return;
    }
    if (!currentPlayerData) {
      toast({ title: "Player not found", variant: "destructive" });
      return;
    }
    fadeMutation.mutate({ playerId: currentPlayerData.id, targetPickId: pickId });
  };

  const handleSendMessage = (message: string, _user: string) => {
    if (!playerAuthStatus?.isAuthenticated) {
      toast({ title: "Login required", description: "Please login to send messages", variant: "destructive" });
      return;
    }
    if (!currentPlayerData) return;
    sendMessageMutation.mutate({ playerId: currentPlayerData.id, message });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Feature 5: Mobile-optimised header — stacks on small screens */}
      <header className="border-b-2 border-neon-cyan py-4 px-4 md:px-8 bg-card/30 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-3xl md:text-5xl font-display text-neon-cyan tracking-wide shrink-0">
              THEBOYZPICK
            </h1>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {playerAuthStatus?.isAuthenticated && playerAuthStatus.player ? (
                <>
                  <span className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap">
                    <span className="text-neon-cyan font-medium">{playerAuthStatus.player.name}</span>
                  </span>
                  {/* Feature 1: change password button */}
                  <ChangePasswordDialog />
                  {authStatus?.isAuthenticated && (
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10 text-xs sm:text-sm" data-testid="button-admin-link">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10 text-xs sm:text-sm"
                    data-testid="button-logout"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button variant="default" size="sm" className="bg-neon-cyan text-background hover:bg-neon-cyan/90 font-medium" data-testid="button-login-link">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Week {activeWeek?.weekNumber || "..."} Slate
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-10 md:space-y-12">
        <section data-testid="section-leaderboard">
          <h2 className="text-2xl md:text-3xl font-display text-neon-magenta mb-4 md:mb-6">
            CHIP COUNT LEADERBOARD
          </h2>
          {/* Feature 5: 2-col on mobile, 4-col on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {sortedPlayers.map((player, idx) => (
              <PlayerCard
                key={player.id}
                id={player.id}
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
          {/* Feature 3: Week selector + Feature 2: Countdown + Submit button */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-2xl md:text-3xl font-display text-neon-cyan">
                {isViewingCurrentWeek
                  ? "THIS WEEK'S PICKS"
                  : `WEEK ${viewingWeek?.weekNumber} PICKS`}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Feature 3: Season history selector */}
                {allWeeks.length > 1 && (
                  <Select
                    value={selectedWeekId ?? activeWeek?.id ?? ""}
                    onValueChange={(val) => {
                      setSelectedWeekId(val === activeWeek?.id ? null : val);
                    }}
                  >
                    <SelectTrigger className="w-36 text-xs sm:text-sm h-9">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...allWeeks]
                        .sort((a, b) => b.weekNumber - a.weekNumber)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            Week {w.weekNumber} {w.isActive ? "(current)" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                {isViewingCurrentWeek && (
                  <PickSubmissionDialog
                    onSubmit={handleSubmitPicks}
                    weekId={activeWeek?.id}
                    isAuthenticated={playerAuthStatus?.isAuthenticated || false}
                  />
                )}
              </div>
            </div>

            {/* Feature 2: Countdown timer — only shown for current week */}
            {isViewingCurrentWeek && pickWindowOpen && (
              <CountdownTimer targetDate={earliestGameTime} />
            )}
            {isViewingCurrentWeek && !pickWindowOpen && earliestGameTime && (
              <p className="text-xs text-destructive font-medium">
                Games have started — picks are locked for this week.
              </p>
            )}
          </div>

          {hasConsensus && <ConsensusBar />}

          {/* Feature 5: Better grid on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                canFade={
                  isViewingCurrentWeek &&
                  playerAuthStatus?.isAuthenticated &&
                  pick.playerName !== currentPlayerName &&
                  pick.status === "pending"
                }
                isOwnPick={pick.playerName === currentPlayerName}
                onFade={() => handleFade(pick.id)}
              />
            ))}
          </div>

          {picks.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {isViewingCurrentWeek
                ? "No picks submitted yet. Be the first to lock in your picks!"
                : "No picks were submitted this week."}
            </p>
          )}
        </section>

        <Separator className="bg-border" />

        <section data-testid="section-chat">
          <h2 className="text-2xl md:text-3xl font-display text-neon-magenta mb-4 md:mb-6">
            THE LOCKER ROOM
          </h2>
          {/* Feature 5: full width on mobile, max-w on desktop */}
          <div className="w-full max-w-3xl">
            <ChatBox
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              currentUser={currentPlayerName}
              disabled={!playerAuthStatus?.isAuthenticated}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-4 md:py-6 px-4 md:px-8 mt-8 md:mt-12">
        <p className="text-center text-xs md:text-sm text-muted-foreground">
          TheBoyzPick • Go Buckeyes!
        </p>
      </footer>
    </div>
  );
}
