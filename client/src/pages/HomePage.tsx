import { useState } from "react";
import PlayerCard from "@/components/PlayerCard";
import PickCard from "@/components/PickCard";
import ConsensusBar from "@/components/ConsensusBar";
import PickSubmissionDialog from "@/components/PickSubmissionDialog";
import ChatBox from "@/components/ChatBox";
import AdminPanel from "@/components/AdminPanel";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const [currentWeek] = useState(9);
  const [currentPlayer] = useState("Money-Mike");
  const [showAdmin, setShowAdmin] = useState(false);

  const players = [
    { name: "Money-Mike", chips: 1250, avatar: "dollar" as const, rank: 1 },
    { name: "The Professor", chips: 1100, avatar: "brain" as const, rank: 2 },
    { name: "Mr. Gut-Feeling", chips: 950, avatar: "crystal" as const, rank: 3 },
    { name: "The Jinx", chips: 750, avatar: "mirror" as const, rank: 4 },
  ];

  const sortedPlayers = [...players].sort((a, b) => b.chips - a.chips);

  const picks = [
    {
      id: "1",
      playerName: "Money-Mike",
      pickType: "LOCK" as const,
      pick: "Eagles -7.5",
      chips: 100,
      isFaded: true,
      fadedBy: ["The Jinx"],
    },
    {
      id: "2",
      playerName: "Money-Mike",
      pickType: "SIDE" as const,
      pick: "Cowboys +3.5",
      chips: 50,
    },
    {
      id: "3",
      playerName: "Money-Mike",
      pickType: "LOTTO" as const,
      pick: "DAL ML + PHI ML + KC ML",
      chips: 10,
    },
    {
      id: "4",
      playerName: "The Professor",
      pickType: "LOCK" as const,
      pick: "Eagles -7.5",
      chips: 100,
    },
    {
      id: "5",
      playerName: "The Professor",
      pickType: "SIDE" as const,
      pick: "49ers -4",
      chips: 50,
    },
    {
      id: "6",
      playerName: "The Professor",
      pickType: "LOTTO" as const,
      pick: "GB + TB + BUF ML",
      chips: 10,
    },
    {
      id: "7",
      playerName: "Mr. Gut-Feeling",
      pickType: "LOCK" as const,
      pick: "Eagles -7.5",
      chips: 100,
    },
    {
      id: "8",
      playerName: "Mr. Gut-Feeling",
      pickType: "SIDE" as const,
      pick: "Packers ML",
      chips: 50,
    },
    {
      id: "9",
      playerName: "Mr. Gut-Feeling",
      pickType: "LOTTO" as const,
      pick: "NYG + LAR + SEA ML",
      chips: 10,
    },
    {
      id: "10",
      playerName: "The Jinx",
      pickType: "LOCK" as const,
      pick: "Patriots +14",
      chips: 100,
    },
    {
      id: "11",
      playerName: "The Jinx",
      pickType: "SIDE" as const,
      pick: "Ravens -3",
      chips: 50,
    },
    {
      id: "12",
      playerName: "The Jinx",
      pickType: "LOTTO" as const,
      pick: "MIA + CIN + DEN ML",
      chips: 10,
    },
  ];

  const [chatMessages, setChatMessages] = useState([
    {
      id: "1",
      user: "Money-Mike",
      message: "Eagles are a LOCK! Easy money boys! 💰",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: "2",
      user: "The Professor",
      message: "I concur. The analytics support the Eagles spread.",
      timestamp: new Date(Date.now() - 240000),
    },
    {
      id: "3",
      user: "The Jinx",
      message: "I'm fading Mike. Eagles are overrated!",
      timestamp: new Date(Date.now() - 180000),
    },
    {
      id: "4",
      user: "Mr. Gut-Feeling",
      message: "My gut says Eagles too. Let's ride! 🦅",
      timestamp: new Date(Date.now() - 120000),
    },
  ]);

  const lockPicks = picks.filter((p) => p.pickType === "LOCK");
  const eaglesLockCount = lockPicks.filter((p) => p.pick === "Eagles -7.5").length;
  const hasConsensus = eaglesLockCount >= 3;

  const handleSendMessage = (message: string, user: string) => {
    const newMsg = {
      id: Date.now().toString(),
      user,
      message,
      timestamp: new Date(),
    };
    setChatMessages([...chatMessages, newMsg]);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-neon-cyan py-6 px-4 md:px-8 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-display text-center text-neon-cyan neon-glow-cyan mb-2">
            THE PARLAY-VOUS LOUNGE
          </h1>
          <p className="text-center text-muted-foreground text-sm md:text-base">
            Week {currentWeek} • Playing as: <span className="text-neon-cyan font-medium">{currentPlayer}</span>
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-12">
        <section data-testid="section-leaderboard">
          <h2 className="text-3xl font-display text-neon-magenta neon-glow-magenta mb-6">
            CHIP COUNT LEADERBOARD
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedPlayers.map((player, idx) => (
              <PlayerCard
                key={player.name}
                name={player.name}
                chips={player.chips}
                avatar={player.avatar}
                rank={player.rank as 1 | 2 | 3 | 4}
                isFirst={idx === 0}
                isLast={idx === sortedPlayers.length - 1}
              />
            ))}
          </div>
        </section>

        <Separator className="bg-border" />

        <section data-testid="section-picks">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-3xl font-display text-neon-cyan neon-glow-cyan">
              THIS WEEK'S PICKS
            </h2>
            <PickSubmissionDialog
              onSubmit={(picks) => console.log("New picks submitted:", picks)}
            />
          </div>

          {hasConsensus && <ConsensusBar />}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.map((pick) => (
              <PickCard
                key={pick.id}
                playerName={pick.playerName}
                pickType={pick.pickType}
                pick={pick.pick}
                chips={pick.chips}
                isFaded={pick.isFaded}
                fadedBy={pick.fadedBy}
                canFade={pick.playerName !== currentPlayer}
                isOwnPick={pick.playerName === currentPlayer}
                onFade={() => console.log(`Fading pick ${pick.id}`)}
              />
            ))}
          </div>
        </section>

        <Separator className="bg-border" />

        <section data-testid="section-chat">
          <h2 className="text-3xl font-display text-neon-magenta neon-glow-magenta mb-6">
            THE LOCKER ROOM
          </h2>
          <div className="max-w-3xl">
            <ChatBox
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              currentUser={currentPlayer}
            />
          </div>
        </section>

        <Separator className="bg-border" />

        <section data-testid="section-admin">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-display text-destructive">
              ADMIN PANEL
            </h2>
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className="text-sm text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-admin"
            >
              {showAdmin ? "Hide" : "Show"}
            </button>
          </div>
          {showAdmin && (
            <AdminPanel
              pendingPicks={picks.map((p) => ({
                ...p,
                isFaded: p.isFaded || false,
                fadedBy: p.fadedBy || [],
              }))}
              onResolveWin={(id) => console.log("Resolved as WIN:", id)}
              onResolveLoss={(id) => console.log("Resolved as LOSS:", id)}
            />
          )}
        </section>
      </main>

      <footer className="border-t border-border py-6 px-4 md:px-8 mt-12">
        <p className="text-center text-sm text-muted-foreground">
          The Parlay-Vous Lounge • Where picks become legends and the chips never lie
        </p>
      </footer>
    </div>
  );
}
