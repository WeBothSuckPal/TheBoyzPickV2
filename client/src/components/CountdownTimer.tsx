import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDate: Date | null;
}

function formatTimeLeft(ms: number) {
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  // Lazy initializer avoids the one-frame flash of "PICKS LOCKED"
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    targetDate ? targetDate.getTime() - Date.now() : 0
  );

  useEffect(() => {
    if (!targetDate) return;

    const tick = () => setTimeLeft(targetDate.getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!targetDate) return null;

  const formatted = formatTimeLeft(timeLeft);
  if (!formatted) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-destructive font-medium">
        <Clock className="w-4 h-4" />
        <span>PICKS LOCKED — games have started</span>
      </div>
    );
  }

  const isUrgent = timeLeft < 4 * 60 * 60 * 1000;   // < 4 hours
  const isWarning = timeLeft < 24 * 60 * 60 * 1000; // < 24 hours

  const colorClass = isUrgent
    ? "text-destructive"
    : isWarning
    ? "text-neon-yellow"
    : "text-neon-green";

  return (
    <div className={`flex items-center gap-1.5 text-sm font-medium ${colorClass}`}>
      <Clock className="w-4 h-4" />
      <span>Picks lock in: <span className="font-mono font-bold">{formatted}</span></span>
    </div>
  );
}
