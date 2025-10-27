import { Card } from "@/components/ui/card";
import { Crown, Frown, Coins } from "lucide-react";

export type PlayerAvatar = "brain" | "crystal" | "dollar" | "mirror";

interface PlayerCardProps {
  name: string;
  chips: number;
  avatar: PlayerAvatar;
  rank?: 1 | 2 | 3 | 4;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function PlayerCard({
  name,
  chips,
  avatar,
  isFirst,
  isLast,
}: PlayerCardProps) {
  const getAvatarComponent = () => {
    const iconClass = "w-16 h-16 text-primary";
    switch (avatar) {
      case "brain":
        return (
          <svg className={iconClass} viewBox="0 0 64 64" fill="none">
            <path
              d="M32 8C24 8 18 14 18 22C18 24 18.5 25.8 19.3 27.4C17.3 28.9 16 31.3 16 34C16 37.9 18.7 41.1 22.3 42.3C23.1 48.8 28 54 34 55.2V56H30V58H34V58H38V56H34V55.2C40 54 44.9 48.8 45.7 42.3C49.3 41.1 52 37.9 52 34C52 31.3 50.7 28.9 48.7 27.4C49.5 25.8 50 24 50 22C50 14 44 8 36 8C35.3 8 34.7 8.1 34 8.2C33.3 8.1 32.7 8 32 8Z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="26" cy="28" r="2" fill="currentColor" />
            <circle cx="38" cy="28" r="2" fill="currentColor" />
          </svg>
        );
      case "crystal":
        return (
          <svg className={iconClass} viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="28" r="16" stroke="currentColor" strokeWidth="2" fill="none" />
            <ellipse cx="32" cy="26" rx="10" ry="6" stroke="currentColor" strokeWidth="1.5" opacity="0.5" fill="none" />
            <path d="M18 44L46 44L44 52C44 54 42 56 40 56H24C22 56 20 54 20 52L18 44Z" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        );
      case "dollar":
        return (
          <svg className={iconClass} viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <path d="M32 14V50M38 20C38 20 36 18 32 18C28 18 26 20 26 23C26 26 28 27 32 28C36 29 38 30 38 33C38 36 36 38 32 38C28 38 26 36 26 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case "mirror":
        return (
          <svg className={iconClass} viewBox="0 0 64 64" fill="none">
            <rect x="14" y="10" width="36" height="44" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M32 10L28 30L32 38L36 26L32 10Z" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="14" y1="24" x2="50" y2="32" stroke="currentColor" strokeWidth="1.5" />
            <line x1="14" y1="38" x2="50" y2="18" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
    }
  };

  return (
    <Card
      className="relative p-6 border-2 border-primary hover-elevate"
      data-testid={`card-player-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {isFirst && (
        <div className="absolute -top-3 -right-3" data-testid="icon-rank-first">
          <Crown className="w-10 h-10 text-neon-yellow fill-neon-yellow" />
        </div>
      )}
      {isLast && (
        <div className="absolute -top-3 -right-3" data-testid="icon-rank-last">
          <Frown className="w-10 h-10 text-destructive" />
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <div data-testid={`icon-avatar-${avatar}`}>
          {getAvatarComponent()}
        </div>

        <h3
          className="text-2xl font-display text-foreground text-center"
          data-testid={`text-player-name-${name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {name}
        </h3>

        <div className="flex items-center gap-3">
          <Coins className="w-8 h-8 text-primary" data-testid="icon-chip" />
          <span
            className="text-3xl font-bold text-foreground"
            data-testid={`text-chips-${name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {chips.toLocaleString()}
          </span>
        </div>
      </div>
    </Card>
  );
}
