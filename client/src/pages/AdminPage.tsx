import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import AdminPanel from "@/components/AdminPanel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, PlusCircle, CheckCircle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface AdminPlayer {
  id: string;
  name: string;
  email: string | null;
  chips: number;
  avatar: string;
  isAdmin: boolean;
  createdAt: string;
}

interface Week {
  id: string;
  weekNumber: number;
  isActive: boolean;
  createdAt: string;
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

interface PlayerAuthStatus {
  isAuthenticated: boolean;
  player?: { id: string; name: string; chips: number; avatar: string; isAdmin?: boolean };
}

// ── Tab IDs ────────────────────────────────────────────────────────────────
type Tab = "picks" | "roster" | "weeks";

// ══════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("picks");

  // ── Auth guards ──────────────────────────────────────────────────────────
  const { data: playerAuthStatus } = useQuery<PlayerAuthStatus>({
    queryKey: ["/api/auth/status"],
  });

  const { data: adminStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  // ── Tab: Pick Control data ────────────────────────────────────────────
  const { data: activeWeek } = useQuery<Week>({
    queryKey: ["/api/weeks/active"],
  });

  const { data: picks = [] } = useQuery<Pick[]>({
    queryKey: ["/api/picks", activeWeek?.id],
    enabled: !!activeWeek?.id,
    queryFn: async () => {
      const res = await fetch(`/api/picks?weekId=${activeWeek!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch picks");
      return res.json();
    },
  });

  // ── Tab: Player Roster data ───────────────────────────────────────────
  const { data: rosterPlayers = [], refetch: refetchRoster } = useQuery<AdminPlayer[]>({
    queryKey: ["/api/admin/players"],
    enabled: adminStatus?.isAuthenticated === true,
  });

  // ── Tab: Week Control data ────────────────────────────────────────────
  const { data: allWeeks = [], refetch: refetchWeeks } = useQuery<Week[]>({
    queryKey: ["/api/admin/weeks"],
    enabled: adminStatus?.isAuthenticated === true,
  });

  // ── Mutations: Pick Control ───────────────────────────────────────────
  const resolvePickMutation = useMutation({
    mutationFn: async (data: { pickId: string; status: "win" | "loss" }) =>
      await apiRequest("POST", `/api/picks/${data.pickId}/resolve`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Pick resolved", description: "Chip counts updated." });
    },
    onError: (error: any) => toast({ title: "Failed to resolve", description: error.message, variant: "destructive" }),
  });

  const fetchGamesMutation = useMutation({
    mutationFn: async (sportKey: string) => {
      if (!activeWeek?.id) throw new Error("No active week found");
      return await apiRequest("POST", "/api/admin/fetch-games", { weekId: activeWeek.id, sportKey });
    },
    onSuccess: (data: any) =>
      toast({ title: "Games fetched", description: `Loaded ${data.count} ${data.sport || ""} games.` }),
    onError: (error: any) => toast({ title: "Fetch failed", description: error.message, variant: "destructive" }),
  });

  const autoResolveMutation = useMutation({
    mutationFn: async (sportKey: string) => {
      if (!activeWeek?.id) throw new Error("No active week found");
      return await apiRequest("POST", "/api/admin/auto-resolve", { weekId: activeWeek.id, sportKey });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Auto-resolve done", description: `${data.resolved} resolved, ${data.skipped} skipped.` });
    },
    onError: (error: any) => toast({ title: "Auto-resolve failed", description: error.message, variant: "destructive" }),
  });

  // ── Mutations: Player Roster ──────────────────────────────────────────
  const [chipInputs, setChipInputs] = useState<Record<string, string>>({});
  const [chipReasons, setChipReasons] = useState<Record<string, string>>({});

  const adjustChipsMutation = useMutation({
    mutationFn: async ({ id, amount, reason }: { id: string; amount: number; reason: string }) =>
      await apiRequest("POST", `/api/admin/players/${id}/chips`, { amount, reason }),
    onSuccess: () => {
      refetchRoster();
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Chips adjusted", description: "Player balance updated." });
    },
    onError: (error: any) => toast({ title: "Failed", description: error.message, variant: "destructive" }),
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("DELETE", `/api/admin/players/${id}`, undefined),
    onSuccess: () => {
      refetchRoster();
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Player removed", description: "Account deleted." });
    },
    onError: (error: any) => toast({ title: "Failed", description: error.message, variant: "destructive" }),
  });

  // ── Mutations: Week Control ───────────────────────────────────────────
  const [newWeekNumber, setNewWeekNumber] = useState("");

  const createWeekMutation = useMutation({
    mutationFn: async (weekNumber: number) =>
      await apiRequest("POST", "/api/admin/weeks", { weekNumber }),
    onSuccess: () => {
      refetchWeeks();
      setNewWeekNumber("");
      toast({ title: "Week created", description: "New week added." });
    },
    onError: (error: any) => toast({ title: "Failed", description: error.message, variant: "destructive" }),
  });

  const activateWeekMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("POST", `/api/admin/weeks/${id}/activate`, {}),
    onSuccess: () => {
      refetchWeeks();
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
      toast({ title: "Active week updated" });
    },
    onError: (error: any) => toast({ title: "Failed", description: error.message, variant: "destructive" }),
  });

  // ── Guard: not logged in ─────────────────────────────────────────────
  if (!playerAuthStatus?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-display text-destructive">ACCESS DENIED</h1>
          <p className="text-muted-foreground">You must be logged in to access this panel.</p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!adminStatus?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-display text-destructive">ADMIN ACCESS REQUIRED</h1>
          <p className="text-muted-foreground">You don't have commissioner privileges.</p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const pendingPicks = picks.filter((p) => p.status === "pending");
  const tabs: { id: Tab; label: string }[] = [
    { id: "picks",  label: "PICK CONTROL"   },
    { id: "roster", label: "PLAYER ROSTER"  },
    { id: "weeks",  label: "WEEK CONTROL"   },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation("/")} className="mb-4" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <h1 className="text-5xl font-display text-destructive mb-1">COMMISSIONER DASHBOARD</h1>
          <p className="text-muted-foreground text-sm">
            Logged in as <span className="text-neon-cyan font-medium">{playerAuthStatus.player?.name}</span>
            {" "}· Owner Access
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex rounded-md overflow-hidden border border-neon-cyan/20 mb-8 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-6 py-2 text-xs font-display tracking-widest transition-colors ${
                activeTab === t.id
                  ? "bg-neon-cyan text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: PICK CONTROL ── */}
        {activeTab === "picks" && (
          <AdminPanel
            pendingPicks={pendingPicks.map((p) => ({ ...p, isFaded: p.isFaded || false, fadedBy: p.fadedBy || [] }))}
            onResolveWin={(id) => resolvePickMutation.mutate({ pickId: id, status: "win" })}
            onResolveLoss={(id) => resolvePickMutation.mutate({ pickId: id, status: "loss" })}
            onFetchGames={(sportKey) => fetchGamesMutation.mutate(sportKey)}
            onAutoResolve={(sportKey) => autoResolveMutation.mutate(sportKey)}
            isFetchingGames={fetchGamesMutation.isPending}
            isAutoResolving={autoResolveMutation.isPending}
            currentWeek={activeWeek}
          />
        )}

        {/* ── TAB: PLAYER ROSTER ── */}
        {activeTab === "roster" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-display text-neon-cyan">PLAYER ROSTER</h2>
              <span className="text-xs text-muted-foreground">{rosterPlayers.length} accounts registered</span>
            </div>

            {rosterPlayers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No players found.</p>
            ) : (
              rosterPlayers.map((p) => (
                <Card key={p.id} className="border border-neon-cyan/20 bg-card/60">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">

                      {/* Player info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-lg text-foreground">{p.name}</span>
                          {p.isAdmin && (
                            <span className="text-xs bg-destructive/20 text-destructive border border-destructive/40 rounded px-1.5 py-0.5 font-display tracking-widest">
                              OWNER
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {p.email ?? <em>no email on file</em>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Chips: <span className="text-neon-cyan font-medium">{p.chips.toLocaleString()}</span>
                          {p.createdAt && (
                            <> · Joined {new Date(p.createdAt).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>

                      {/* Chip adjustment */}
                      {!p.isAdmin && (
                        <div className="flex items-end gap-2 flex-wrap">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase tracking-widest">Adjust Chips</Label>
                            <Input
                              type="number"
                              placeholder="+500 or -200"
                              value={chipInputs[p.id] ?? ""}
                              onChange={(e) => setChipInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              className="w-32 border-neon-cyan/30 focus:border-neon-cyan text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase tracking-widest">Reason</Label>
                            <Input
                              type="text"
                              placeholder="Optional reason"
                              value={chipReasons[p.id] ?? ""}
                              onChange={(e) => setChipReasons((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              className="w-36 border-neon-cyan/30 focus:border-neon-cyan text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10"
                            disabled={!chipInputs[p.id] || adjustChipsMutation.isPending}
                            onClick={() => {
                              const amount = parseInt(chipInputs[p.id] ?? "0", 10);
                              if (isNaN(amount) || amount === 0) return;
                              adjustChipsMutation.mutate({
                                id: p.id,
                                amount,
                                reason: chipReasons[p.id] ?? "",
                              });
                              setChipInputs((prev) => ({ ...prev, [p.id]: "" }));
                              setChipReasons((prev) => ({ ...prev, [p.id]: "" }));
                            }}
                          >
                            Apply
                          </Button>

                          {/* Delete */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={deletePlayerMutation.isPending}
                            onClick={() => {
                              if (confirm(`Remove ${p.name} from the league? This cannot be undone.`)) {
                                deletePlayerMutation.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── TAB: WEEK CONTROL ── */}
        {activeTab === "weeks" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-display text-neon-cyan">WEEK CONTROL</h2>

            {/* Create new week */}
            <Card className="border border-neon-cyan/20 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display tracking-widest text-muted-foreground uppercase">
                  Create New Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-widest">Week Number</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 12"
                      value={newWeekNumber}
                      onChange={(e) => setNewWeekNumber(e.target.value)}
                      className="w-28 border-neon-cyan/30 focus:border-neon-cyan"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const n = parseInt(newWeekNumber, 10);
                      if (isNaN(n) || n < 1) return;
                      createWeekMutation.mutate(n);
                    }}
                    disabled={!newWeekNumber || createWeekMutation.isPending}
                    className="bg-neon-cyan text-background hover:bg-neon-cyan/90 font-display tracking-widest"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" /> Create Week
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* All weeks list */}
            <div className="space-y-3">
              {allWeeks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No weeks found.</p>
              ) : (
                [...allWeeks]
                  .sort((a, b) => b.weekNumber - a.weekNumber)
                  .map((w) => (
                    <Card key={w.id} className={`border ${w.isActive ? "border-neon-cyan/60 bg-neon-cyan/5" : "border-neon-cyan/20 bg-card/60"}`}>
                      <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                        <div>
                          <span className="font-display text-lg text-foreground">
                            Week {w.weekNumber}
                          </span>
                          {w.isActive && (
                            <span className="ml-2 text-xs bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 rounded px-1.5 py-0.5 font-display tracking-widest">
                              ACTIVE
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Created {new Date(w.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!w.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 font-display tracking-widest"
                            disabled={activateWeekMutation.isPending}
                            onClick={() => activateWeekMutation.mutate(w.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Set Active
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
