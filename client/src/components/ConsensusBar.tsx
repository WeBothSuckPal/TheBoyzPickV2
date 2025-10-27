export default function ConsensusBar() {
  return (
    <div
      className="w-full py-4 px-6 mb-6 rounded-md gradient-neon animate-pulse-glow"
      style={{
        background: "linear-gradient(90deg, hsl(var(--neon-cyan)), hsl(var(--neon-magenta)))",
      }}
      data-testid="banner-consensus"
    >
      <h2 className="text-3xl md:text-4xl font-display text-center text-background font-black tracking-wider">
        🤝 HOUSE IS SHAKING 🤝
      </h2>
    </div>
  );
}
