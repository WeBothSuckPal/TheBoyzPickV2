import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// ── ESPN public scoreboard API — no key required ──────────────────────────
const SPORTS = [
  { label: "NFL",   sport: "football",   league: "nfl",             icon: "🏈" },
  { label: "NBA",   sport: "basketball", league: "nba",             icon: "🏀" },
  { label: "MLB",   sport: "baseball",   league: "mlb",             icon: "⚾" },
  { label: "NCAAF", sport: "football",   league: "college-football", icon: "🎓" },
] as const;

type SportKey = typeof SPORTS[number]["label"];

interface ESPNCompetitor {
  homeAway: "home" | "away";
  score: string;
  team: { abbreviation: string; displayName: string };
}

interface ESPNEvent {
  id: string;
  shortName: string;
  status: {
    displayClock: string;
    period: number;
    type: {
      name: string;          // STATUS_SCHEDULED | STATUS_IN_PROGRESS | STATUS_FINAL
      completed: boolean;
      state: "pre" | "in" | "post";
      shortDetail: string;   // "Final", "Q2 5:34", "7:30 PM ET"
    };
  };
  competitions: Array<{
    competitors: ESPNCompetitor[];
  }>;
}

async function fetchESPNScoreboard(sport: string, league: string): Promise<ESPNEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
  const data = await res.json();
  return (data.events ?? []) as ESPNEvent[];
}

function StatusBadge({ state, detail }: { state: string; detail: string }) {
  if (state === "in") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-display tracking-wider bg-neon-green/20 text-neon-green border border-neon-green/30">
        <span className="size-1.5 rounded-full bg-neon-green animate-pulse" />
        LIVE · {detail}
      </span>
    );
  }
  if (state === "post") {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-display tracking-wider bg-muted text-muted-foreground">
        FINAL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-display tracking-wider text-muted-foreground">
      {detail}
    </span>
  );
}

function ScoreRow({ event }: { event: ESPNEvent }) {
  const comps = event.competitions[0]?.competitors ?? [];
  const away = comps.find((c) => c.homeAway === "away");
  const home = comps.find((c) => c.homeAway === "home");
  const { state, shortDetail } = event.status.type;
  const isLive = state === "in";
  const isFinal = state === "post";

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-xs font-display tracking-wide space-x-1.5">
            <span className={`${isLive || isFinal ? "text-foreground" : "text-muted-foreground"}`}>
              {away?.team.abbreviation ?? "—"}
            </span>
            <span className="text-muted-foreground/40">@</span>
            <span className={`${isLive || isFinal ? "text-foreground" : "text-muted-foreground"}`}>
              {home?.team.abbreviation ?? "—"}
            </span>
          </div>
        </div>
      </div>
      {(isLive || isFinal) && (
        <div className="text-xs font-display tracking-widest text-neon-cyan shrink-0">
          {away?.score} – {home?.score}
        </div>
      )}
      <div className="shrink-0">
        <StatusBadge state={state} detail={shortDetail} />
      </div>
    </div>
  );
}

export default function LiveScores() {
  const [activeSport, setActiveSport] = useState<SportKey>("NFL");
  const current = SPORTS.find((s) => s.label === activeSport)!;

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["espn-scores", current.sport, current.league],
    queryFn: () => fetchESPNScoreboard(current.sport, current.league),
    refetchInterval: 45_000, // refresh every 45s
    staleTime: 30_000,
    retry: 1,
  });

  const liveCount = events?.filter((e) => e.status.type.state === "in").length ?? 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-display tracking-widest text-neon-cyan uppercase">
            Today's Scores
          </span>
          {liveCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-display bg-neon-green/20 text-neon-green border border-neon-green/30">
              <span className="size-1.5 rounded-full bg-neon-green animate-pulse" />
              {liveCount} LIVE
            </span>
          )}
        </div>
        {/* Sport tabs */}
        <div className="flex gap-0.5">
          {SPORTS.map((s) => (
            <button
              key={s.label}
              onClick={() => setActiveSport(s.label)}
              className={`px-2.5 py-1 rounded text-[11px] font-display tracking-wider transition-colors ${
                activeSport === s.label
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-2 max-h-56 overflow-y-auto">
        {isLoading && (
          <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
            Loading scores…
          </div>
        )}
        {isError && (
          <div className="py-4 text-center text-xs text-muted-foreground">
            Scores unavailable right now
          </div>
        )}
        {!isLoading && !isError && (!events || events.length === 0) && (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No {activeSport} games scheduled today
          </div>
        )}
        {events?.map((event) => (
          <ScoreRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
