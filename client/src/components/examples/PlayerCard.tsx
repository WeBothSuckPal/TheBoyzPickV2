import PlayerCard from "../PlayerCard";

export default function PlayerCardExample() {
  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        <PlayerCard
          name="Money-Mike"
          chips={1250}
          avatar="dollar"
          isFirst={true}
        />
        <PlayerCard
          name="The Professor"
          chips={1100}
          avatar="brain"
        />
        <PlayerCard
          name="Mr. Gut-Feeling"
          chips={950}
          avatar="crystal"
        />
        <PlayerCard
          name="The Jinx"
          chips={750}
          avatar="mirror"
          isLast={true}
        />
      </div>
    </div>
  );
}
