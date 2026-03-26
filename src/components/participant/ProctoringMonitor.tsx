import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, Mic, AlertCircle, Move } from 'lucide-react';

type ProctoringMonitorProps = {
  sessionId: string;
};

type WidgetPosition = {
  x: number;
  y: number;
};

const SNAPSHOT_INTERVAL_MS = 20000;
const WIDGET_WIDTH = 272;
const WIDGET_HEIGHT = 236;
const SNAPSHOT_WIDTH = 224;
const SNAPSHOT_HEIGHT = 126;
const INITIAL_SNAPSHOT_DELAY_MS = 3500;

function runWhenIdle(task: () => void) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const idleWindow = window as Window & {
      requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    };

    idleWindow.requestIdleCallback(() => task(), { timeout: 1200 });
    return;
  }

  window.setTimeout(task, 0);
}

export function ProctoringMonitor({ sessionId }: ProctoringMonitorProps) {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [position, setPosition] = useState<WidgetPosition>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dragOffsetRef = useRef<WidgetPosition>({ x: 0, y: 0 });
  const snapshotIntervalRef = useRef<number | null>(null);
  const mediaStateRef = useRef({ cameraEnabled: false, micEnabled: false });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotInFlightRef = useRef(false);

  useEffect(() => {
    setPosition({
      x: Math.max(window.innerWidth - WIDGET_WIDTH - 24, 16),
      y: 16,
    });
  }, []);

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
      if (snapshotIntervalRef.current) {
        window.clearInterval(snapshotIntervalRef.current);
      }
      void logProctoringEvent('session_ended');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextX = Math.min(
        Math.max(event.clientX - dragOffsetRef.current.x, 8),
        Math.max(window.innerWidth - WIDGET_WIDTH - 8, 8)
      );
      const nextY = Math.min(
        Math.max(event.clientY - dragOffsetRef.current.y, 8),
        Math.max(window.innerHeight - WIDGET_HEIGHT - 8, 8)
      );

      setPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      setDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging]);

  const initializeProctoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      setCameraEnabled(videoTrack?.enabled || false);
      setMicEnabled(audioTrack?.enabled || false);
      mediaStateRef.current = {
        cameraEnabled: videoTrack?.enabled || false,
        micEnabled: audioTrack?.enabled || false,
      };

      videoTrack?.addEventListener('ended', () => {
        setCameraEnabled(false);
        mediaStateRef.current.cameraEnabled = false;
        void logProctoringEvent('camera_blocked');
      });

      audioTrack?.addEventListener('ended', () => {
        setMicEnabled(false);
        mediaStateRef.current.micEnabled = false;
        void logProctoringEvent('microphone_blocked');
      });

      snapshotIntervalRef.current = window.setInterval(() => {
        runWhenIdle(() => {
          void uploadSnapshot();
        });
      }, SNAPSHOT_INTERVAL_MS);

      window.setTimeout(() => {
        runWhenIdle(() => {
          void uploadSnapshot();
        });
      }, INITIAL_SNAPSHOT_DELAY_MS);
    } catch (error) {
      console.error('Error initializing proctoring:', error);
      void logProctoringEvent('camera_blocked');
      void logProctoringEvent('microphone_blocked');
    }
  };

  const uploadSnapshot = async () => {
    if (!videoRef.current || !mediaStateRef.current.cameraEnabled || snapshotInFlightRef.current) return;
    if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

    snapshotInFlightRef.current = true;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.width = SNAPSHOT_WIDTH;
    canvas.height = SNAPSHOT_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) {
      snapshotInFlightRef.current = false;
      return;
    }

    try {
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = await new Promise<string | null>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }

            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          0.28,
        );
      });

      if (!imageData) {
        return;
      }

      await logProctoringEvent('snapshot_uploaded', {
        imageData,
        capturedAt: new Date().toISOString(),
      });
    } finally {
      snapshotInFlightRef.current = false;
    }
  };

  const logProctoringEvent = async (
    eventType:
      | 'camera_blocked'
      | 'microphone_blocked'
      | 'tab_switch'
      | 'session_started'
      | 'session_ended'
      | 'snapshot_uploaded',
    eventData?: Record<string, unknown>
  ) => {
    try {
      await supabase.from('proctoring_logs').insert([
        {
          session_id: sessionId,
          event_type: eventType,
          event_data: eventData || null,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error logging proctoring event:', error);
    }
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setDragging(true);
  };

  return (
    <>
      <div className="fixed z-50 select-none" style={{ left: position.x, top: position.y }}>
        <div className="w-56 rounded-[20px] border border-[rgba(119,123,179,0.14)] bg-white shadow-[0_10px_18px_rgba(71,80,140,0.08)]">
          <div
            onPointerDown={handleDragStart}
            className="flex cursor-grab items-center justify-between rounded-t-[20px] border-b border-[rgba(119,123,179,0.12)] bg-[#f7f8ff] px-3 py-2 text-xs font-semibold text-[color:var(--ink-soft)] active:cursor-grabbing"
          >
            <span>Proctoring Monitor</span>
            <Move className="h-4 w-4" />
          </div>

          <div className="p-3">
            <div className="relative mb-2 h-32 overflow-hidden rounded-[16px] bg-gray-900">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedData={() => {
                  window.setTimeout(() => {
                    runWhenIdle(() => {
                      void uploadSnapshot();
                    });
                  }, 500);
                }}
                className="h-full w-full object-cover"
              />
              {!cameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <Camera className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className={`flex items-center gap-1 ${cameraEnabled ? 'text-green-600' : 'text-red-600'}`}>
                <Camera className="h-3 w-3" />
                <span>{cameraEnabled ? 'On' : 'Off'}</span>
              </div>
              <div className={`flex items-center gap-1 ${micEnabled ? 'text-green-600' : 'text-red-600'}`}>
                <Mic className="h-3 w-3" />
                <span>{micEnabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showWarning && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-3 rounded-full bg-yellow-500 px-6 py-3 text-white shadow-[0_12px_24px_rgba(191,135,0,0.2)]">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Warning: Tab switching detected!</span>
          </div>
        </div>
      )}
    </>
  );
}

