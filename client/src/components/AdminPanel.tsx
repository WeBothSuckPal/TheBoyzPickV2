import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface PendingPick {
  id: string;
  playerName: string;
  pickType: "LOCK" | "SIDE" | "LOTTO";
  pick: string;
  chips: number;
  isFaded: boolean;
  fadedBy: string[];
}

interface AdminPanelProps {
  pendingPicks?: PendingPick[];
  onResolveWin?: (pickId: string) => void;
  onResolveLoss?: (pickId: string) => void;
}

export default function AdminPanel({
  pendingPicks = [],
  onResolveWin,
  onResolveLoss,
}: AdminPanelProps) {
  const handleWin = (pickId: string) => {
    console.log(`Resolved pick ${pickId} as WIN`);
    onResolveWin?.(pickId);
  };

  const handleLoss = (pickId: string) => {
    console.log(`Resolved pick ${pickId} as LOSS`);
    onResolveLoss?.(pickId);
  };

  return (
    <Card className="p-6 border-2 border-destructive" data-testid="card-admin-panel">
      <h3 className="text-2xl font-display text-destructive mb-6">
        ADMIN PANEL - RESOLVE PICKS
      </h3>

      <div className="space-y-4">
        {pendingPicks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8" data-testid="text-no-pending">
            No pending picks to resolve
          </p>
        ) : (
          pendingPicks.map((pick) => (
            <Card
              key={pick.id}
              className="p-4 bg-card/50"
              data-testid={`card-admin-pick-${pick.id}`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-display text-xs"
                      data-testid={`badge-type-${pick.id}`}
                    >
                      {pick.pickType}
                    </Badge>
                    {pick.isFaded && (
                      <span className="text-lg" data-testid={`icon-faded-${pick.id}`}>
                        🥶
                      </span>
                    )}
                  </div>
                  <p className="font-medium" data-testid={`text-player-${pick.id}`}>
                    {pick.playerName}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid={`text-pick-${pick.id}`}>
                    {pick.pick}
                  </p>
                  <p className="text-sm" data-testid={`text-chips-${pick.id}`}>
                    🪙 {pick.chips} chips
                  </p>
                  {pick.isFaded && pick.fadedBy.length > 0 && (
                    <p className="text-xs text-muted-foreground" data-testid={`text-faded-by-${pick.id}`}>
                      Faded by: {pick.fadedBy.join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleWin(pick.id)}
                    className="bg-neon-green text-background hover:bg-neon-green/90 font-display"
                    data-testid={`button-win-${pick.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    WIN
                  </Button>
                  <Button
                    onClick={() => handleLoss(pick.id)}
                    variant="destructive"
                    className="font-display"
                    data-testid={`button-loss-${pick.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    LOSS
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Card>
  );
}
