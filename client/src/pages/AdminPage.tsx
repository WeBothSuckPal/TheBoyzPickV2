import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import AdminPanel from "@/components/AdminPanel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

interface PlayerAuthStatus {
  isAuthenticated: boolean;
  player?: {
    id: string;
    name: string;
    chips: number;
    avatar: string;
  };
}

interface AdminStatus {
  isAuthenticated: boolean;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: playerAuthStatus } = useQuery<PlayerAuthStatus>({
    queryKey: ["/api/auth/status"],
  });

  const { data: adminStatus } = useQuery<AdminStatus>({
    queryKey: ["/api/admin/status"],
  });

  const { data: activeWeek } = useQuery<Week>({
    queryKey: ["/api/weeks/active"],
  });

  const { data: picks = [] } = useQuery<Pick[]>({
    queryKey: ["/api/picks"],
  });

  const pendingPicks = picks.filter((pick) => pick.status === "pending");

  const resolvePickMutation = useMutation({
    mutationFn: async (data: { pickId: string; status: "win" | "loss" }) => {
      return await apiRequest("POST", `/api/picks/${data.pickId}/resolve`, {
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Pick resolved",
        description: "Chip counts have been updated",
      });
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
      return await apiRequest("POST", "/api/admin/fetch-games", { 
        weekId: activeWeek.id, 
        sportKey 
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Games fetched successfully",
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

  // Redirect if not logged in as Carter or not admin
  if (!playerAuthStatus?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-display text-destructive">
            ACCESS DENIED
          </h1>
          <p className="text-muted-foreground">
            You must be logged in to access the admin panel.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!adminStatus?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-display text-destructive">
            ADMIN ACCESS REQUIRED
          </h1>
          <p className="text-muted-foreground">
            You don't have admin privileges.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-5xl font-display text-destructive mb-2">
            ADMIN PANEL
          </h1>
          <p className="text-muted-foreground">
            Manage games, resolve picks, and control the week
          </p>
        </div>

        <AdminPanel
          pendingPicks={pendingPicks.map((p) => ({
            ...p,
            isFaded: p.isFaded || false,
            fadedBy: p.fadedBy || [],
          }))}
          onResolveWin={(id) => resolvePickMutation.mutate({ pickId: id, status: "win" })}
          onResolveLoss={(id) => resolvePickMutation.mutate({ pickId: id, status: "loss" })}
          onFetchGames={(sportKey) => fetchGamesMutation.mutate(sportKey)}
          isFetchingGames={fetchGamesMutation.isPending}
          currentWeek={activeWeek}
        />
      </div>
    </div>
  );
}
