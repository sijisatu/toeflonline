import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, Mic, AlertCircle } from 'lucide-react';

type ProctoringMonitorProps = {
  sessionId: string;
};

export function ProctoringMonitor({ sessionId }: ProctoringMonitorProps) {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    void initializeProctoring();
    void logProctoringEvent('session_started');

    const handleVisibilityChange = () => {
      if (document.hidden) {
        void logProctoringEvent('tab_switch');
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void logProctoringEvent('session_ended');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sessionId]);

  const initializeProctoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      setCameraEnabled(videoTrack?.enabled || false);
      setMicEnabled(audioTrack?.enabled || false);

      videoTrack?.addEventListener('ended', () => {
        setCameraEnabled(false);
        void logProctoringEvent('camera_blocked');
      });

      audioTrack?.addEventListener('ended', () => {
        setMicEnabled(false);
        void logProctoringEvent('microphone_blocked');
      });
    } catch (error) {
      console.error('Error initializing proctoring:', error);
      void logProctoringEvent('camera_blocked');
      void logProctoringEvent('microphone_blocked');
    }
  };

  const logProctoringEvent = async (
    eventType: 'camera_blocked' | 'microphone_blocked' | 'tab_switch' | 'session_started' | 'session_ended'
  ) => {
    try {
      await supabase.from('proctoring_logs').insert([
        {
          session_id: sessionId,
          event_type: eventType,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error logging proctoring event:', error);
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <div className="relative w-48 h-36 bg-gray-900 rounded-lg overflow-hidden mb-2">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div
              className={`flex items-center gap-1 ${
                cameraEnabled ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>{cameraEnabled ? 'On' : 'Off'}</span>
            </div>
            <div
              className={`flex items-center gap-1 ${
                micEnabled ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>{micEnabled ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>
      </div>

      {showWarning && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Warning: Tab switching detected!</span>
          </div>
        </div>
      )}
    </>
  );
}
