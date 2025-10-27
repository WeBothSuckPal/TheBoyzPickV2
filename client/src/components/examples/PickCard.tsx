import PickCard from "../PickCard";

export default function PickCardExample() {
  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        <PickCard
          playerName="Money-Mike"
          pickType="LOCK"
          pick="Eagles -7.5"
          chips={100}
          status="pending"
          canFade={true}
          onFade={() => console.log("Faded!")}
        />
        <PickCard
          playerName="The Professor"
          pickType="LOCK"
          pick="Chiefs ML"
          chips={100}
          status="pending"
          isFaded={true}
          fadedBy={["The Jinx", "Mr. Gut-Feeling"]}
        />
        <PickCard
          playerName="Mr. Gut-Feeling"
          pickType="SIDE"
          pick="Cowboys +3.5"
          chips={50}
          status="pending"
        />
        <PickCard
          playerName="The Jinx"
          pickType="LOTTO"
          pick="DAL ML + PHI ML + KC ML"
          chips={10}
          status="win"
        />
        <PickCard
          playerName="Money-Mike"
          pickType="SIDE"
          pick="49ers -4"
          chips={50}
          status="loss"
        />
        <PickCard
          playerName="The Professor"
          pickType="LOTTO"
          pick="GB + TB + BUF ML Parlay"
          chips={10}
          status="pending"
        />
      </div>
    </div>
  );
}
