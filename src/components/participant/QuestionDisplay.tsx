import { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

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

export function QuestionDisplay({ question, selectedAnswer, onSelectAnswer }: QuestionDisplayProps) {
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
      audioRef.current.play();
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
    <div className="space-y-6">
      {question.audio_url && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Volume2 className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">Audio</span>
          </div>

          <audio
            ref={audioRef}
            src={question.audio_url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <div className="flex-1">
              <div className="relative h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-blue-600 transition-all"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="text-gray-900">
          <span className="font-semibold">{question.question_number}.</span> {question.question_text}
        </div>

        {question.question_image_url && (
          <div className="my-4">
            <img
              src={question.question_image_url}
              alt={`Question ${question.question_number}`}
              className="max-w-full h-auto rounded-lg border border-gray-200"
              loading="lazy"
            />
          </div>
        )}

        <div className="space-y-2">
          {question.options.map((option) => (
            <button
              key={option.option_label}
              onClick={() => onSelectAnswer(option.option_label)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedAnswer === option.option_label
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold ${
                    selectedAnswer === option.option_label
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {option.option_label}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-gray-900">{option.option_text}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
