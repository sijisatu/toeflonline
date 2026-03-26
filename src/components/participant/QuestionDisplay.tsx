import { memo, useRef, useEffect, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';

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
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
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
    <div className="space-y-7">
      {question.audio_url && (
        <div className="rounded-[28px] bg-[#f5f4ff] p-6">
          <div className="mb-5 text-center">
            <div className="text-3xl font-extrabold text-[color:var(--ink-strong)]">{question.audio_duration_seconds ? 'Listening Prompt' : 'Audio Track'}</div>
            <div className="mt-2 text-sm text-[color:var(--ink-soft)]">Play the audio and answer the question below.</div>
          </div>

          <audio
            ref={audioRef}
            src={question.audio_url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />

          <div className="mx-auto flex max-w-4xl items-center gap-4 rounded-[28px] border border-[rgba(119,123,179,0.12)] bg-white px-5 py-5">
            <button
              onClick={togglePlay}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d56dd,#1551bd)] text-white transition-transform hover:scale-[1.02]"
            >
              {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
            </button>

            <div className="flex-1">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[color:var(--ink-main)]">
                <Volume2 className="h-4 w-4 text-[color:var(--blue)]" />
                Listening player
              </div>
              <div className="flex items-end gap-2 overflow-hidden rounded-full bg-[#eef2ff] px-4 py-5">
                {Array.from({ length: 26 }).map((_, index) => {
                  const heights = [18, 34, 52, 26, 62, 22, 41, 55, 30, 67, 39, 21];
                  const barHeight = heights[index % heights.length];
                  const activeWidth = duration > 0 ? Math.floor((currentTime / duration) * 26) : 0;
                  const isActive = index <= activeWidth;

                  return (
                    <div
                      key={index}
                      className={`w-2 rounded-full transition-colors ${isActive ? 'bg-[color:var(--blue)]' : 'bg-[#7ea5ff]'}`}
                      style={{ height: `${barHeight}px`, opacity: isActive ? 1 : 0.72 }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between text-sm font-semibold text-[color:var(--ink-soft)]">
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
        <div className="max-w-5xl text-3xl font-extrabold leading-tight text-[color:var(--ink-strong)]">
          {question.question_text}
        </div>

        {question.question_image_url && (
          <div className="overflow-hidden rounded-[28px] border border-[rgba(119,123,179,0.16)] bg-white p-3">
            <img
              src={question.question_image_url}
              alt={`Question ${question.question_number}`}
              className="max-h-[360px] w-full rounded-[24px] object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="space-y-4 pt-2">
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option.option_label;

            return (
              <button
                key={option.option_label}
                onClick={() => onSelectAnswer(option.option_label)}
                className={`w-full rounded-[30px] border bg-white px-5 py-5 text-left transition-all ${
                  isSelected
                    ? 'border-[color:var(--blue)] bg-[#edf2ff]'
                    : 'border-[rgba(119,123,179,0.14)] hover:border-[rgba(35,88,230,0.28)] hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-extrabold ${
                      isSelected
                        ? 'bg-[linear-gradient(135deg,#1d56dd,#1551bd)] text-white'
                        : 'bg-[#ecebff] text-[color:var(--ink-main)]'
                    }`}
                  >
                    {option.option_label}
                  </div>
                  <div className="flex-1 text-base font-medium leading-8 text-[color:var(--ink-strong)]">
                    {option.option_text}
                  </div>
                  {isSelected && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--blue)] text-white">
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
