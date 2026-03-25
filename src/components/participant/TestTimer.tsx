import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TestTimerProps = {
  initialSeconds: number;
  onTimeUp: () => void;
  sessionId: string;
};

export function TestTimer({ initialSeconds, onTimeUp, sessionId }: TestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        const newValue = prev - 1;

        if (newValue <= 0) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }

        if (newValue % 30 === 0) {
          supabase
            .from('test_sessions')
            .update({ time_remaining_seconds: newValue })
            .eq('id', sessionId)
            .then();
        }

        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId, onTimeUp]);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const isLowTime = seconds < 300;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-semibold ${
        isLowTime
          ? 'bg-red-100 text-red-700 animate-pulse'
          : 'bg-blue-50 text-blue-700'
      }`}
    >
      <Clock className="w-5 h-5" />
      <span>
        {hours > 0 && `${hours}:`}
        {minutes.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
