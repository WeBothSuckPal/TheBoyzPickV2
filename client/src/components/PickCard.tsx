import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Snowflake, CheckCircle2, XCircle, Coins } from "lucide-react";
import { useState } from "react";

export type PickType = "LOCK" | "SIDE" | "LOTTO";
export type PickStatus = "pending" | "win" | "loss";

interface PickCardProps {
  playerName: string;
  pickType: PickType;
  pick: string;
  chips: number;
  status?: PickStatus;
  isFaded?: boolean;
  fadedBy?: string[];
  onFade?: () => void;
  canFade?: boolean;
  isOwnPick?: boolean;
}

export default function PickCard({
  playerName,
  pickType,
  pick,
  chips,
  status = "pending",
  isFaded = false,
  fadedBy = [],
  onFade,
  canFade = true,
  isOwnPick = false,
}: PickCardProps) {
  const [isShaking, setIsShaking] = useState(false);

  const getBorderColor = () => {
    if (status === "win") return "border-neon-green";
    if (status === "loss") return "border-destructive";
    switch (pickType) {
      case "LOCK":
        return "border-neon-cyan";
      case "SIDE":
        return "border-neon-magenta";
      case "LOTTO":
        return "border-neon-yellow";
    }
  };

  const getTypeColor = () => {
    switch (pickType) {
      case "LOCK":
        return "bg-neon-cyan/20 text-neon-cyan border-neon-cyan";
      case "SIDE":
        return "bg-neon-magenta/20 text-neon-magenta border-neon-magenta";
      case "LOTTO":
        return "bg-neon-yellow/20 text-neon-yellow border-neon-yellow";
    }
  };

  const handleFade = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    onFade?.();
    console.log(`Faded ${playerName}'s ${pickType}: ${pick}`);
  };

  return (
    <Card
      className={`p-4 border-l-4 ${getBorderColor()} ${
        status === "win" ? "neon-border-cyan" : ""
      } ${status === "loss" ? "opacity-60" : ""} ${isShaking ? "animate-shake" : ""}`}
      data-testid={`card-pick-${playerName.toLowerCase().replace(/\s+/g, '-')}-${pickType.toLowerCase()}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={`${getTypeColor()} font-display text-xs`}
                data-testid={`badge-pick-type-${pickType.toLowerCase()}`}
              >
                {pickType}
              </Badge>
              {isFaded && (
                <Snowflake className="w-5 h-5 text-primary" data-testid="icon-faded" />
              )}
              {status === "win" && (
                <CheckCircle2 className="w-5 h-5 text-neon-green" data-testid="icon-win" />
              )}
              {status === "loss" && (
                <XCircle className="w-5 h-5 text-destructive" data-testid="icon-loss" />
              )}
            </div>
            <p
              className="text-sm text-muted-foreground mb-1 font-medium"
              data-testid={`text-player-${playerName.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {playerName}
            </p>
            <p
              className="text-lg font-semibold text-foreground"
              data-testid={`text-pick-${playerName.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {pick}
            </p>
          </div>

          {pickType === "LOCK" && !isOwnPick && canFade && status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleFade}
              disabled={isFaded}
              className="border-neon-magenta text-neon-magenta hover:bg-neon-magenta hover:text-background"
              data-testid={`button-fade-${playerName.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {isFaded ? "FADED" : "FADE"}
            </Button>
          )}
        </div>

        {isFaded && fadedBy.length > 0 && (
          <p className="text-sm text-muted-foreground" data-testid="text-faded-by">
            Faded by: {fadedBy.join(", ")}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Coins className="w-5 h-5 text-primary" data-testid="icon-chip-amount" />
          <span
            className="font-bold text-foreground"
            data-testid={`text-chip-amount-${chips}`}
          >
            {chips} CHIPS
          </span>
        </div>
      </div>
    </Card>
  );
}
