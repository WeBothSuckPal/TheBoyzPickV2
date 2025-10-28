import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Snowflake, Coins, Download } from "lucide-react";

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
  onFetchGames?: (sportKey: string) => void;
  isFetchingGames?: boolean;
  currentWeek?: { weekNumber: number; };
}

const SPORTS = [
  { key: "americanfootball_ncaaf", label: "College Football (NCAAF)" },
  { key: "americanfootball_nfl", label: "NFL" },
  { key: "baseball_mlb", label: "MLB" },
  { key: "basketball_ncaab", label: "Men's College Basketball" },
  { key: "basketball_nba", label: "NBA" },
];

export default function AdminPanel({
  pendingPicks = [],
  onResolveWin,
  onResolveLoss,
  onFetchGames,
  isFetchingGames = false,
  currentWeek,
}: AdminPanelProps) {
  const [selectedSport, setSelectedSport] = useState("americanfootball_ncaaf");

  const handleWin = (pickId: string) => {
    console.log(`Resolved pick ${pickId} as WIN`);
    onResolveWin?.(pickId);
  };

  const handleLoss = (pickId: string) => {
    console.log(`Resolved pick ${pickId} as LOSS`);
    onResolveLoss?.(pickId);
  };

  const handleFetchGames = () => {
    onFetchGames?.(selectedSport);
  };

  return (
    <Card className="p-6 border-2 border-destructive" data-testid="card-admin-panel">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-display text-destructive">
            ADMIN PANEL
          </h3>
          {currentWeek && (
            <Badge variant="outline" className="font-display text-sm" data-testid="badge-current-week">
              Week {currentWeek.weekNumber}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Weeks are automatically determined by date. Fetch games for the current week below.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label className="font-display text-sm">Sport</Label>
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger data-testid="select-sport">
                <SelectValue placeholder="Select sport" />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map((sport) => (
                  <SelectItem key={sport.key} value={sport.key}>
                    {sport.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={handleFetchGames}
              disabled={isFetchingGames}
              className="bg-primary text-primary-foreground font-display w-full md:w-auto"
              data-testid="button-fetch-games"
            >
              <Download className="w-4 h-4 mr-2" />
              {isFetchingGames ? "Fetching..." : "Fetch Games"}
            </Button>
          </div>
        </div>
      </div>

      <h4 className="text-lg font-display text-destructive mb-4">
        RESOLVE PICKS
      </h4>

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
                      <Snowflake className="w-5 h-5 text-primary" data-testid={`icon-faded-${pick.id}`} />
                    )}
                  </div>
                  <p className="font-semibold text-lg" data-testid={`text-player-${pick.id}`}>
                    {pick.playerName}
                  </p>
                  <p className="text-base text-muted-foreground font-medium" data-testid={`text-pick-${pick.id}`}>
                    {pick.pick}
                  </p>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium" data-testid={`text-chips-${pick.id}`}>
                      {pick.chips} chips
                    </p>
                  </div>
                  {pick.isFaded && pick.fadedBy.length > 0 && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-faded-by-${pick.id}`}>
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
