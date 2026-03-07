interface SportsTickerProps {
  weekNumber?: number;
}

const TICKER_ITEMS = [
  { icon: "🏈", text: "NFL" },
  { icon: "🏀", text: "NBA" },
  { icon: "⚾", text: "MLB" },
  { icon: "🎓", text: "NCAAB" },
  { icon: "🏈", text: "NCAAF" },
  { icon: "🎯", text: "LOCK YOUR PICKS" },
  { icon: "🔥", text: "WHO'S GOT THE HOT HAND?" },
  { icon: "💰", text: "CHIPS ON THE LINE" },
  { icon: "📊", text: "PICK EM & FADE EM" },
  { icon: "⚡", text: "THE BOYZ ARE BACK" },
];

export default function SportsTicker({ weekNumber }: SportsTickerProps) {
  const weekLabel = weekNumber ? `WEEK ${weekNumber} ACTION` : "PICK SEASON LIVE";

  // Double the items so the loop is seamless
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="relative overflow-hidden border-y border-neon-cyan/30 bg-card/40 py-2">
      {/* Left fade */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-background to-transparent" />
      {/* Right fade */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-background to-transparent" />

      <div className="animate-marquee">
        {items.map((item, i) => (
          <span
            key={i}
            className="mx-6 inline-flex items-center gap-2 text-xs font-display tracking-widest text-muted-foreground"
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-neon-cyan/70">{item.text}</span>
            <span className="text-neon-cyan/30">•</span>
          </span>
        ))}
        {/* Week badge pinned in the center */}
        <span className="mx-6 inline-flex items-center gap-2 rounded border border-neon-yellow/40 bg-neon-yellow/10 px-3 py-0.5 text-xs font-display tracking-widest text-neon-yellow">
          🏆 {weekLabel}
        </span>
      </div>
    </div>
  );
}
