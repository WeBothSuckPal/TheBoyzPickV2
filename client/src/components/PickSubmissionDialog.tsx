import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trophy, Shield, CircleDot, Activity } from "lucide-react";
import { format } from "date-fns";

const SPORT_CONFIG = {
  "americanfootball_ncaaf": { label: "College Football", icon: Trophy, color: "text-neon-cyan" },
  "americanfootball_nfl": { label: "NFL", icon: Shield, color: "text-neon-magenta" },
  "baseball_mlb": { label: "MLB", icon: CircleDot, color: "text-neon-yellow" },
  "basketball_ncaab": { label: "Men's College Basketball", icon: Activity, color: "text-neon-green" },
  "basketball_nba": { label: "NBA", icon: Activity, color: "text-orange-400" },
} as const;

interface Game {
  id: string;
  weekId: string;
  sportKey: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  homeSpread: string | null;
  awaySpread: string | null;
  overUnder: string | null;
}

interface PickSubmission {
  lock: string;
  side: string;
  lotto: string;
  lockGameId: string;
  sideGameId: string;
  lottoGameId: string;
}

interface PickSubmissionDialogProps {
  onSubmit?: (picks: PickSubmission) => void;
  weekId?: string;
}

export default function PickSubmissionDialog({ onSubmit, weekId }: PickSubmissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [lockGameId, setLockGameId] = useState("");
  const [lockPick, setLockPick] = useState("");
  const [sideGameId, setSideGameId] = useState("");
  const [sidePick, setSidePick] = useState("");
  const [lottoGameId, setLottoGameId] = useState("");
  const [lottoPick, setLottoPick] = useState("");

  const { data: games = [], isError: gamesError } = useQuery<Game[]>({
    queryKey: ["/api/games", weekId],
    enabled: !!weekId && open,
    queryFn: async () => {
      const response = await fetch(`/api/games?weekId=${weekId}`);
      if (!response.ok) throw new Error("Failed to fetch games");
      return response.json();
    },
  });

  useEffect(() => {
    if (!open) {
      setSportFilter("all");
      setLockGameId("");
      setLockPick("");
      setSideGameId("");
      setSidePick("");
      setLottoGameId("");
      setLottoPick("");
    }
  }, [open]);

  const getPickText = (gameId: string, pickType: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return "";
    
    if (pickType === "home") {
      return `${game.homeTeam} ${game.homeSpread || ""}`.trim();
    } else if (pickType === "away") {
      return `${game.awayTeam} ${game.awaySpread || ""}`.trim();
    } else if (pickType === "over") {
      return `Over ${game.overUnder || ""}`.trim();
    } else if (pickType === "under") {
      return `Under ${game.overUnder || ""}`.trim();
    }
    return "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const picks: PickSubmission = {
      lock: getPickText(lockGameId, lockPick),
      side: getPickText(sideGameId, sidePick),
      lotto: getPickText(lottoGameId, lottoPick),
      lockGameId,
      sideGameId,
      lottoGameId,
    };
    console.log("Submitted picks:", picks);
    onSubmit?.(picks);
    setOpen(false);
  };

  const lockText = getPickText(lockGameId, lockPick);
  const sideText = getPickText(sideGameId, sidePick);
  const lottoText = getPickText(lottoGameId, lottoPick);
  
  const isValid = lockText.length > 0 && sideText.length > 0 && lottoText.length > 0;

  const getGameOptions = (selectedGameIds: string[]) => {
    const now = new Date();
    return games.filter(game => {
      const gameStarted = new Date(game.commenceTime) <= now;
      const matchesSportFilter = sportFilter === "all" || game.sportKey === sportFilter;
      return !selectedGameIds.includes(game.id) && !gameStarted && matchesSportFilter;
    });
  };

  const availableSports = Array.from(new Set(games.map(g => g.sportKey)))
    .filter(sportKey => sportKey in SPORT_CONFIG)
    .sort();

  const earliestGameTime = games.length > 0
    ? games.reduce((earliest, game) => {
        const gameTime = new Date(game.commenceTime);
        return gameTime < earliest ? gameTime : earliest;
      }, new Date(games[0].commenceTime))
    : null;

  const renderGameSelect = (
    value: string,
    onChange: (value: string) => void,
    label: string,
    color: string,
    otherGameIds: string[],
    testId: string
  ) => {
    const availableGames = getGameOptions(otherGameIds);
    const selectedGame = games.find(g => g.id === value);
    
    return (
      <div className="space-y-2">
        <Label className={`font-display ${color}`}>{label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger data-testid={testId}>
            <SelectValue placeholder="Select a game">
              {selectedGame && (
                <span className="text-sm">
                  {selectedGame.awayTeam} @ {selectedGame.homeTeam}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableGames.length === 0 && (
              <SelectItem value="no-games" disabled data-testid="text-no-games">
                {gamesError ? "Error loading games" : "No games available"}
              </SelectItem>
            )}
            {availableGames.map((game) => {
              const sportConfig = SPORT_CONFIG[game.sportKey as keyof typeof SPORT_CONFIG];
              const SportIcon = sportConfig?.icon || Trophy;
              return (
                <SelectItem key={game.id} value={game.id}>
                  <div className="flex items-start gap-2 text-sm">
                    <SportIcon className={`w-4 h-4 mt-0.5 ${sportConfig?.color || ''}`} />
                    <div className="flex-1">
                      <div className="font-medium">
                        {game.awayTeam} @ {game.homeTeam}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{sportConfig?.label || game.sportKey}</span>
                        <span>•</span>
                        <span>{format(new Date(game.commenceTime), "EEE M/d h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderPickTypeSelect = (
    gameId: string,
    value: string,
    onChange: (value: string) => void,
    testId: string
  ) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return null;

    const hasSpread = game.homeSpread && game.awaySpread;
    const hasTotal = game.overUnder;
    const hasAnyOdds = hasSpread || hasTotal;

    return (
      <div className="space-y-2">
        <Label>Pick</Label>
        {!hasAnyOdds ? (
          <div className="p-3 text-sm text-muted-foreground border border-border rounded-md">
            No odds available for this game
          </div>
        ) : (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger data-testid={testId}>
              <SelectValue placeholder="Select your pick" />
            </SelectTrigger>
            <SelectContent>
              {game.homeSpread && (
                <SelectItem value="home">
                  {game.homeTeam} {game.homeSpread}
                </SelectItem>
              )}
              {game.awaySpread && (
                <SelectItem value="away">
                  {game.awayTeam} {game.awaySpread}
                </SelectItem>
              )}
              {game.overUnder && (
                <SelectItem value="over">
                  Over {game.overUnder}
                </SelectItem>
              )}
              {game.overUnder && (
                <SelectItem value="under">
                  Under {game.overUnder}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-neon-cyan text-background hover:bg-neon-cyan/90 font-display text-lg"
          data-testid="button-submit-picks"
        >
          <Plus className="w-5 h-5 mr-2" />
          SUBMIT PICKS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-2 border-neon-cyan" data-testid="dialog-submit-picks">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-neon-cyan neon-glow-cyan">
            SUBMIT YOUR PICKS
          </DialogTitle>
          <DialogDescription>
            Select your three picks for this week. Remember: LOCK (100 chips), SIDE (50 chips), LOTTO (10 chips).
            {earliestGameTime && (
              <div className="mt-2 text-sm text-neon-yellow">
                ⚠ First game starts: {format(earliestGameTime, "EEE M/d h:mm a")}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {availableSports.length > 1 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <Label>Filter by Sport</Label>
            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger data-testid="select-sport-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-medium">All Sports</span>
                </SelectItem>
                {availableSports.map((sportKey) => {
                  const sportConfig = SPORT_CONFIG[sportKey as keyof typeof SPORT_CONFIG];
                  const SportIcon = sportConfig?.icon || Trophy;
                  return (
                    <SelectItem key={sportKey} value={sportKey}>
                      <div className="flex items-center gap-2">
                        <SportIcon className={`w-4 h-4 ${sportConfig?.color || ''}`} />
                        <span>{sportConfig?.label || sportKey}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4 p-4 rounded-md border-l-4 border-neon-cyan bg-card/50">
            <div className="font-display text-neon-cyan mb-2">
              LOCK (100 CHIPS)
            </div>
            {renderGameSelect(
              lockGameId,
              setLockGameId,
              "Game",
              "text-neon-cyan",
              [sideGameId, lottoGameId].filter(Boolean),
              "select-lock-game"
            )}
            {lockGameId && renderPickTypeSelect(lockGameId, lockPick, setLockPick, "select-lock-pick")}
          </div>

          <div className="space-y-4 p-4 rounded-md border-l-4 border-neon-magenta bg-card/50">
            <div className="font-display text-neon-magenta mb-2">
              SIDE (50 CHIPS)
            </div>
            {renderGameSelect(
              sideGameId,
              setSideGameId,
              "Game",
              "text-neon-magenta",
              [lockGameId, lottoGameId].filter(Boolean),
              "select-side-game"
            )}
            {sideGameId && renderPickTypeSelect(sideGameId, sidePick, setSidePick, "select-side-pick")}
          </div>

          <div className="space-y-4 p-4 rounded-md border-l-4 border-neon-yellow bg-card/50">
            <div className="font-display text-neon-yellow mb-2">
              LOTTO (10 CHIPS)
            </div>
            {renderGameSelect(
              lottoGameId,
              setLottoGameId,
              "Game",
              "text-neon-yellow",
              [lockGameId, sideGameId].filter(Boolean),
              "select-lotto-game"
            )}
            {lottoGameId && renderPickTypeSelect(lottoGameId, lottoPick, setLottoPick, "select-lotto-pick")}
          </div>

          <Button
            type="submit"
            className="w-full bg-neon-cyan text-background hover:bg-neon-cyan/90 font-display text-lg"
            disabled={!isValid}
            data-testid="button-confirm-submit"
          >
            LOCK IT IN
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
