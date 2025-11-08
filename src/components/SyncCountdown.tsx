import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, RefreshCw } from "lucide-react";
import { formatTime, formatCountdown } from "@/utils/formatters";

interface SyncCountdownProps {
  lastRunAt: string | null;
  intervalMinutes?: number;
}

export default function SyncCountdown({ lastRunAt, intervalMinutes = 5 }: SyncCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!lastRunAt) {
      setSecondsLeft(0);
      return;
    }

    const calculateSecondsLeft = () => {
      const lastRun = new Date(lastRunAt).getTime();
      const nextUpdate = lastRun + intervalMinutes * 60 * 1000;
      const now = Date.now();
      const diff = Math.max(0, Math.floor((nextUpdate - now) / 1000));
      return diff;
    };

    // Calcular imediatamente
    setSecondsLeft(calculateSecondsLeft());

    // Atualizar a cada segundo
    const interval = setInterval(() => {
      setSecondsLeft(calculateSecondsLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRunAt, intervalMinutes]);

  if (!lastRunAt) {
    return (
      <Card className="border-muted">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>Nenhuma atualização registrada ainda</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Última atualização:</span>
            <span className="font-medium">{formatTime(lastRunAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Próxima atualização em:</span>
            <span className="font-mono font-medium tabular-nums">
              {secondsLeft > 0 ? formatCountdown(secondsLeft) : "Atualizando..."}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
