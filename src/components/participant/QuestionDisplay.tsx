import { memo, useRef, useEffect, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { resolveMediaUrl } from '../../lib/supabase';

type Question = {
  id: string;
  question_number: number;
  question_text: string;
  question_image_url?: string;
  audio_url?: string;
  audio_duration_seconds?: number;
  options: {
    option_label: string;
    option_text: string;
  }[];
};

type QuestionDisplayProps = {
  question: Question;
  selectedAnswer?: string;
  onSelectAnswer: (answer: string) => void;
};

function QuestionDisplayComponent({ question, selectedAnswer, onSelectAnswer }: QuestionDisplayProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const resolvedAudioUrl = resolveMediaUrl(question.audio_url);
  const resolvedImageUrl = resolveMediaUrl(question.question_image_url);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [question.id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {resolvedAudioUrl && (
        <div className="rounded-[24px] bg-[#f5f4ff] p-4 sm:rounded-[28px] sm:p-6">
          <div className="mb-5 text-center">
            <div className="text-2xl font-extrabold text-[color:var(--ink-strong)] sm:text-3xl">
              {question.audio_duration_seconds ? 'Listening Prompt' : 'Audio Track'}
            </div>
            <div className="mt-2 text-sm text-[color:var(--ink-soft)]">Play the audio and answer the question below.</div>
          </div>

          <audio ref={audioRef} src={resolvedAudioUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} />

          <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-[24px] border border-[rgba(119,123,179,0.12)] bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-5 sm:py-5 sm:rounded-[28px]">
            <button
              onClick={togglePlay}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d56dd,#1551bd)] text-white transition-transform hover:scale-[1.02] sm:mx-0 sm:h-20 sm:w-20"
            >
              {isPlaying ? <Pause className="h-7 w-7 sm:h-8 sm:w-8" /> : <Play className="ml-1 h-7 w-7 sm:h-8 sm:w-8" />}
            </button>

            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[color:var(--ink-main)]">
                <Volume2 className="h-4 w-4 text-[color:var(--blue)]" />
                Listening player
              </div>
              <div className="flex items-end gap-1.5 overflow-hidden rounded-full bg-[#eef2ff] px-3 py-4 sm:gap-2 sm:px-4 sm:py-5">
                {Array.from({ length: 26 }).map((_, index) => {
                  const heights = [18, 34, 52, 26, 62, 22, 41, 55, 30, 67, 39, 21];
                  const barHeight = heights[index % heights.length];
                  const activeWidth = duration > 0 ? Math.floor((currentTime / duration) * 26) : 0;
                  const isActive = index <= activeWidth;

                  return (
                    <div
                      key={index}
                      className={`w-1.5 rounded-full transition-colors sm:w-2 ${isActive ? 'bg-[color:var(--blue)]' : 'bg-[#7ea5ff]'}`}
                      style={{ height: `${barHeight}px`, opacity: isActive ? 1 : 0.72 }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between text-xs font-semibold text-[color:var(--ink-soft)] sm:text-sm">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="inline-flex rounded-full bg-[color:var(--blue-soft)] px-4 py-2 text-sm font-bold text-[color:var(--blue-deep)]">
          Question {question.question_number}
        </div>
        <div className="max-w-5xl text-2xl font-extrabold leading-tight text-[color:var(--ink-strong)] sm:text-3xl">
          {question.question_text}
        </div>

        {resolvedImageUrl && (
          <div className="overflow-hidden rounded-[24px] border border-[rgba(119,123,179,0.16)] bg-white p-2 sm:rounded-[28px] sm:p-3">
            <img src={resolvedImageUrl} alt={`Question ${question.question_number}`} className="max-h-[300px] w-full rounded-[20px] object-cover sm:max-h-[360px] sm:rounded-[24px]" loading="lazy" />
          </div>
        )}

        <div className="space-y-3 pt-2 sm:space-y-4">
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option.option_label;

            return (
              <button
                key={option.option_label}
                onClick={() => onSelectAnswer(option.option_label)}
                className={`w-full rounded-[24px] border bg-white px-4 py-4 text-left transition-all sm:rounded-[30px] sm:px-5 sm:py-5 ${
                  isSelected ? 'border-[color:var(--blue)] bg-[#edf2ff]' : 'border-[rgba(119,123,179,0.14)] hover:border-[rgba(35,88,230,0.28)] hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-extrabold sm:h-12 sm:w-12 sm:text-lg ${
                      isSelected ? 'bg-[linear-gradient(135deg,#1d56dd,#1551bd)] text-white' : 'bg-[#ecebff] text-[color:var(--ink-main)]'
                    }`}
                  >
                    {option.option_label}
                  </div>
                  <div className="min-w-0 flex-1 text-sm font-medium leading-7 text-[color:var(--ink-strong)] sm:text-base sm:leading-8">
                    {option.option_text}
                  </div>
                  {isSelected && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--blue)] text-white sm:mt-0 sm:h-8 sm:w-8">
                      <div className="h-2.5 w-2.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const QuestionDisplay = memo(QuestionDisplayComponent);
