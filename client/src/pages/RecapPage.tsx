import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Share2, Trophy, TrendingUp, TrendingDown } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface PlayerRecap {
  playerId: string;
  playerName: string;
  avatar: string;
  wins: number;
  losses: number;
  pending: number;
  chipDelta: number;
  bestPick: { pick: string; chips: number; pickType: string } | null;
  worstPick: { pick: string; chips: number; pickType: string } | null;
  grade: string;
}

interface Week {
  id: string;
  weekNumber: number;
  isActive: boolean;
}

// ── Grade styling ──────────────────────────────────────────────────────────
function gradeStyle(grade: string): { bg: string; text: string; border: string } {
  if (grade === "A+") return { bg: "bg-neon-green/20",    text: "text-neon-green",   border: "border-neon-green" };
  if (grade === "A")  return { bg: "bg-neon-green/10",    text: "text-neon-green",   border: "border-neon-green/60" };
  if (grade === "B+") return { bg: "bg-neon-cyan/20",     text: "text-neon-cyan",    border: "border-neon-cyan" };
  if (grade === "B")  return { bg: "bg-neon-cyan/10",     text: "text-neon-cyan",    border: "border-neon-cyan/60" };
  if (grade === "C+") return { bg: "bg-neon-yellow/20",   text: "text-neon-yellow",  border: "border-neon-yellow" };
  if (grade === "C")  return { bg: "bg-neon-yellow/10",   text: "text-neon-yellow",  border: "border-neon-yellow/60" };
  if (grade === "D")  return { bg: "bg-orange-500/10",    text: "text-orange-400",   border: "border-orange-400/60" };
  if (grade === "F")  return { bg: "bg-destructive/20",   text: "text-destructive",  border: "border-destructive" };
  return               { bg: "bg-muted/20",               text: "text-muted-foreground", border: "border-muted" };
}

function gradeRoast(grade: string, name: string): string {
  if (grade === "A+") return `${name} is absolutely on FIRE. Do not fade. 🔥`;
  if (grade === "A")  return `Solid week from ${name}. Respectable. 👊`;
  if (grade === "B+") return `${name} had a good showing. Almost elite. 📈`;
  if (grade === "B")  return `${name} went .500+. Could be worse. 🤷`;
  if (grade === "C+") return `Barely above water, ${name}. Stay humble. 😬`;
  if (grade === "C")  return `${name} is average and they know it. 😐`;
  if (grade === "D")  return `${name} needs to hit the tape. Rough one. 📉`;
  if (grade === "F")  return `${name} got cooked. Touch grass. 💀`;
  return `${name} hasn't finished yet — picks still pending.`;
}

// ── Share text builder ─────────────────────────────────────────────────────
function buildShareText(recap: PlayerRecap[], weekNumber: number): string {
  const header = `🏆 THEBOYZPICK — Week ${weekNumber} Report Cards 🏆\n`;
  const lines = recap.map((p) => {
    const record = `${p.wins}-${p.losses}`;
    const delta = p.chipDelta >= 0 ? `+${p.chipDelta}` : `${p.chipDelta}`;
    const grade = p.grade === "N/A" ? "(no picks)" : `[${p.grade}]`;
    return `${p.playerName} ${grade}: ${record} | ${delta} chips`;
  });
  return header + lines.join("\n") + "\n\nwww.theboyzpick.com";
}

// ══════════════════════════════════════════════════════════════════════════
export default function RecapPage() {
  const params = useParams<{ weekId: string }>();
  const weekId = params.weekId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: recap = [], isLoading: recapLoading } = useQuery<PlayerRecap[]>({
    queryKey: ["/api/weeks/recap", weekId],
    queryFn: async () => {
      const res = await fetch(`/api/weeks/${weekId}/recap`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load recap");
      return res.json();
    },
    enabled: !!weekId,
  });

  const { data: weeks = [] } = useQuery<Week[]>({
    queryKey: ["/api/weeks"],
  });

  const week = weeks.find((w) => w.id === weekId);
  const weekNumber = week?.weekNumber ?? "?";

  const handleShare = () => {
    const text = buildShareText(recap, typeof weekNumber === "number" ? weekNumber : 0);
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied to clipboard!", description: "Paste it in the group chat." });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Try selecting the text manually.", variant: "destructive" });
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background emojis */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden select-none" aria-hidden>
        <span className="absolute top-[10%] left-[5%]  text-6xl opacity-[0.04]">🏆</span>
        <span className="absolute top-[30%] right-[6%] text-5xl opacity-[0.04]">📊</span>
        <span className="absolute bottom-[20%] left-[8%] text-5xl opacity-[0.04]">🔥</span>
        <span className="absolute bottom-[8%] right-[5%] text-6xl opacity-[0.04]">💰</span>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl relative">

        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation("/")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-display text-neon-yellow tracking-wide">
                WEEK {weekNumber} REPORT CARDS
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Who balled out? Who got cooked? The grades don't lie.
              </p>
            </div>
            {recap.length > 0 && (
              <Button
                onClick={handleShare}
                className="bg-neon-cyan text-background hover:bg-neon-cyan/90 font-display tracking-widest"
              >
                <Share2 className="w-4 h-4 mr-2" />
                SHARE RESULTS
              </Button>
            )}
          </div>
        </div>

        {/* Loading */}
        {recapLoading && (
          <div className="text-center py-16 text-muted-foreground font-display tracking-widest">
            LOADING GRADES...
          </div>
        )}

        {/* No data */}
        {!recapLoading && recap.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No picks found for this week.</p>
            <p className="text-muted-foreground text-sm mt-2">
              Picks need to be submitted and resolved before a recap is available.
            </p>
          </div>
        )}

        {/* Report Cards Grid */}
        {recap.length > 0 && (
          <>
            {/* Trophy row for top performer */}
            {recap[0] && recap[0].grade !== "N/A" && (
              <div className="flex items-center gap-2 mb-6 text-neon-yellow font-display tracking-widest text-sm">
                <Trophy className="w-5 h-5" />
                <span>TOP PERFORMER THIS WEEK: {recap[0].playerName}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recap.map((player, idx) => {
                const gs = gradeStyle(player.grade);
                const isTopDog = idx === 0 && player.grade !== "N/A";
                const isDoghouse = idx === recap.length - 1 && player.grade !== "N/A" && recap.length > 1;

                return (
                  <Card
                    key={player.playerId}
                    className={`border-2 ${gs.border} bg-card/70 relative overflow-hidden`}
                  >
                    {isTopDog && (
                      <div className="absolute top-0 right-0 bg-neon-yellow/20 border-b border-l border-neon-yellow/40 px-2 py-0.5 text-neon-yellow text-xs font-display tracking-widest rounded-bl">
                        👑 TOP DOG
                      </div>
                    )}
                    {isDoghouse && (
                      <div className="absolute top-0 right-0 bg-destructive/20 border-b border-l border-destructive/40 px-2 py-0.5 text-destructive text-xs font-display tracking-widest rounded-bl">
                        💀 DOGHOUSE
                      </div>
                    )}

                    <CardHeader className="pb-2 pt-4 px-5">
                      <div className="flex items-start justify-between gap-3">
                        {/* Player info */}
                        <div>
                          <h2 className="text-xl font-display text-foreground leading-tight">
                            {player.playerName}
                          </h2>
                          <p className="text-sm text-muted-foreground mt-0.5 italic">
                            {gradeRoast(player.grade, player.playerName)}
                          </p>
                        </div>

                        {/* Grade badge */}
                        <div className={`shrink-0 w-16 h-16 rounded-lg border-2 ${gs.border} ${gs.bg} flex items-center justify-center`}>
                          <span className={`text-3xl font-display font-bold ${gs.text}`}>
                            {player.grade}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-5 space-y-4">
                      {/* W-L record + chip delta */}
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-display font-bold text-foreground">
                            {player.wins}-{player.losses}
                            {player.pending > 0 && (
                              <span className="text-sm text-muted-foreground ml-1">({player.pending} pending)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest">Record</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-2xl font-display font-bold flex items-center gap-1 ${
                            player.chipDelta > 0 ? "text-neon-green" : player.chipDelta < 0 ? "text-destructive" : "text-muted-foreground"
                          }`}>
                            {player.chipDelta > 0 ? <TrendingUp className="w-5 h-5" /> : player.chipDelta < 0 ? <TrendingDown className="w-5 h-5" /> : null}
                            {player.chipDelta > 0 ? "+" : ""}{player.chipDelta}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest">Chips</p>
                        </div>
                      </div>

                      {/* Best / Worst picks */}
                      <div className="space-y-2 text-sm">
                        {player.bestPick && (
                          <div className="flex items-start gap-2">
                            <span className="text-neon-green font-display tracking-widest shrink-0 text-xs mt-0.5">BEST</span>
                            <span className="text-foreground truncate">
                              {player.bestPick.pick}
                              <span className="text-muted-foreground ml-1.5">
                                ({player.bestPick.chips} chips · {player.bestPick.pickType})
                              </span>
                            </span>
                          </div>
                        )}
                        {player.worstPick && (
                          <div className="flex items-start gap-2">
                            <span className="text-destructive font-display tracking-widest shrink-0 text-xs mt-0.5">WORST</span>
                            <span className="text-foreground truncate">
                              {player.worstPick.pick}
                              <span className="text-muted-foreground ml-1.5">
                                ({player.worstPick.chips} chips · {player.worstPick.pickType})
                              </span>
                            </span>
                          </div>
                        )}
                        {!player.bestPick && !player.worstPick && (
                          <p className="text-muted-foreground italic text-xs">Picks still pending.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Shareable text preview */}
            <div className="mt-8 rounded-lg border border-neon-cyan/20 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground font-display tracking-widest mb-2 uppercase">
                Share Text Preview
              </p>
              <pre className="text-xs text-foreground/70 whitespace-pre-wrap font-mono leading-relaxed">
                {buildShareText(recap, typeof weekNumber === "number" ? weekNumber : 0)}
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 font-display tracking-widest text-xs"
                onClick={handleShare}
              >
                <Share2 className="w-3 h-3 mr-1.5" /> Copy to Clipboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
