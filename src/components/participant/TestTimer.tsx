import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
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
          supabase.from('test_sessions').update({ time_remaining_seconds: newValue }).eq('id', sessionId).then();
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
      className={`inline-flex items-center gap-3 rounded-full px-5 py-3 text-base font-extrabold shadow-[0_16px_28px_rgba(80,89,151,0.14)] ${
        isLowTime ? 'bg-[#ffe3ea] text-[#ba345b]' : 'bg-[#ffecc7] text-[#8f5a00]'
      }`}
    >
      <Clock3 className="h-5 w-5" />
      <span className="font-['Manrope'] tracking-[0.02em]">
        {hours > 0 && `${hours}:`}
        {minutes.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
