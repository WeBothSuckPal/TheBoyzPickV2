import AdminPanel from "../AdminPanel";

export default function AdminPanelExample() {
  const mockPicks = [
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
      playerName: "The Professor",
      pickType: "SIDE" as const,
      pick: "Chiefs ML",
      chips: 50,
      isFaded: false,
      fadedBy: [],
    },
    {
      id: "3",
      playerName: "Mr. Gut-Feeling",
      pickType: "LOTTO" as const,
      pick: "DAL ML + PHI ML + KC ML",
      chips: 10,
      isFaded: false,
      fadedBy: [],
    },
  ];

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <AdminPanel
          pendingPicks={mockPicks}
          onResolveWin={(id) => console.log("Resolved as WIN:", id)}
          onResolveLoss={(id) => console.log("Resolved as LOSS:", id)}
        />
      </div>
    </div>
  );
}
