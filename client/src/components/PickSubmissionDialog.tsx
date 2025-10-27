import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface PickSubmission {
  player: string;
  lock: string;
  side: string;
  lotto: string;
}

interface PickSubmissionDialogProps {
  onSubmit?: (picks: PickSubmission) => void;
}

export default function PickSubmissionDialog({ onSubmit }: PickSubmissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [player, setPlayer] = useState("");
  const [lock, setLock] = useState("");
  const [side, setSide] = useState("");
  const [lotto, setLotto] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const picks: PickSubmission = { player, lock, side, lotto };
    console.log("Submitted picks:", picks);
    onSubmit?.(picks);
    setOpen(false);
    setPlayer("");
    setLock("");
    setSide("");
    setLotto("");
  };

  const isValid = player && lock && side && lotto;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-neon-cyan text-background hover:bg-neon-cyan/90 font-display text-lg"
          data-testid="button-submit-picks"
        >
          <Plus className="w-5 h-5 mr-2" />
          SUBMIT PICKS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-2 border-neon-cyan" data-testid="dialog-submit-picks">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-neon-cyan neon-glow-cyan">
            SUBMIT YOUR PICKS
          </DialogTitle>
          <DialogDescription>
            Enter your three picks for this week. Remember: LOCK (100 chips), SIDE (50 chips), LOTTO (10 chips).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="player" className="font-display text-sm">
              SELECT PLAYER
            </Label>
            <Select value={player} onValueChange={setPlayer}>
              <SelectTrigger id="player" data-testid="select-player">
                <SelectValue placeholder="Choose your profile..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Money-Mike">Money-Mike 🪙</SelectItem>
                <SelectItem value="The Professor">The Professor 🧠</SelectItem>
                <SelectItem value="Mr. Gut-Feeling">Mr. Gut-Feeling 🔮</SelectItem>
                <SelectItem value="The Jinx">The Jinx 🪞</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 p-4 rounded-md border-l-4 border-neon-cyan bg-card/50">
            <Label htmlFor="lock" className="font-display text-neon-cyan">
              LOCK (100 CHIPS)
            </Label>
            <Input
              id="lock"
              value={lock}
              onChange={(e) => setLock(e.target.value)}
              placeholder="e.g., Eagles -7.5"
              className="border-neon-cyan focus:border-neon-cyan"
              data-testid="input-lock"
            />
          </div>

          <div className="space-y-4 p-4 rounded-md border-l-4 border-neon-magenta bg-card/50">
            <Label htmlFor="side" className="font-display text-neon-magenta">
              SIDE (50 CHIPS)
            </Label>
            <Input
              id="side"
              value={side}
              onChange={(e) => setSide(e.target.value)}
              placeholder="e.g., Cowboys +3.5"
              className="border-neon-magenta focus:border-neon-magenta"
              data-testid="input-side"
            />
          </div>

          <div className="space-y-4 p-4 rounded-md border-l-4 border-neon-yellow bg-card/50">
            <Label htmlFor="lotto" className="font-display text-neon-yellow">
              LOTTO (10 CHIPS)
            </Label>
            <Input
              id="lotto"
              value={lotto}
              onChange={(e) => setLotto(e.target.value)}
              placeholder="e.g., DAL ML + PHI ML + KC ML"
              className="border-neon-yellow focus:border-neon-yellow"
              data-testid="input-lotto"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-neon-cyan text-background hover:bg-neon-cyan/90 font-display text-lg"
            disabled={!isValid}
            data-testid="button-confirm-submit"
          >
            LOCK IT IN
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
