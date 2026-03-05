import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface ChipTransaction {
  id: string;
  playerId: string;
  amount: number;
  reason: string;
  weekId: string | null;
  createdAt: string;
}

interface ChipHistoryDialogProps {
  playerId: string;
  playerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChipHistoryDialog({ playerId, playerName, open, onOpenChange }: ChipHistoryDialogProps) {
  const { data: transactions = [], isLoading } = useQuery<ChipTransaction[]>({
    queryKey: ["/api/players", playerId, "transactions"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/transactions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] bg-card border-2 border-neon-cyan">
        <DialogHeader>
          <DialogTitle className="text-xl font-display text-neon-cyan">
            {playerName.toUpperCase()} — CHIP HISTORY
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[55vh] space-y-2 mt-2 pr-1">
          {isLoading && (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          )}
          {!isLoading && transactions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No chip transactions yet.</p>
          )}
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-start gap-3 p-3 rounded-md bg-background/40 border border-border">
              <div className="mt-0.5 shrink-0">
                {tx.amount >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-neon-green" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug break-words">{tx.reason}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 font-mono font-bold ${
                  tx.amount >= 0
                    ? "border-neon-green text-neon-green"
                    : "border-destructive text-destructive"
                }`}
              >
                {tx.amount >= 0 ? "+" : ""}{tx.amount}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
