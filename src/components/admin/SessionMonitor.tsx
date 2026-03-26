import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { AlertTriangle, Camera, CircleOff, History, MonitorPlay, Radio, RefreshCcw, ShieldAlert, UserSquare2 } from 'lucide-react';
import { API_ORIGIN, Certificate, TestPackage, TestSession, supabase } from '../../lib/supabase';

type MonitorMode = 'in_progress' | 'completed' | 'violations';

type ProfileLite = {
  id: string;
  full_name: string;
  email: string;
};

type ProctoringLogLite = {
  id: string;
  session_id: string;
  event_type: string;
  timestamp: string;
};

type SnapshotLog = {
  id: string;
  session_id: string;
  event_type: string;
  timestamp: string;
  event_data?: {
    imageData?: string;
    capturedAt?: string;
  } | null;
};

type CertificateLite = Pick<Certificate, 'session_id' | 'listening_score' | 'structure_score' | 'reading_score' | 'total_score'>;

type MonitoringSignal =
  | RTCSessionDescriptionInit
  | {
      type: 'ice-candidate';
      candidate: RTCIceCandidateInit;
    };

type SessionView = TestSession & {
  participantName: string;
  participantEmail: string;
  packageTitle: string;
  answerCount: number;
  violationCount: number;
  latestLog: ProctoringLogLite | null;
  events: ProctoringLogLite[];
  certificate: CertificateLite | null;
};

const MONITOR_MODES: Array<{ id: MonitorMode; label: string; description: string; icon: typeof MonitorPlay }> = [
  { id: 'in_progress', label: 'In Progress', description: 'Active exam sessions with live camera monitoring.', icon: MonitorPlay },
  { id: 'completed', label: 'Completed History', description: 'Finished attempts, grouped as individual session records.', icon: History },
  { id: 'violations', label: 'With Violations', description: 'Sessions that triggered at least one monitoring warning.', icon: ShieldAlert },
];

export function SessionMonitor() {
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [mode, setMode] = useState<MonitorMode>('in_progress');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotLog | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [participantOnline, setParticipantOnline] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'waiting' | 'connecting' | 'live' | 'offline'>('idle');
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const selectedSessionRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    void loadSessions(true);

    const interval = window.setInterval(() => {
      void loadSessions(false);
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = io(`${API_ORIGIN}/monitoring`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      const sessionId = selectedSessionRef.current;
      if (sessionId) {
        socket.emit('admin:join', { sessionId });
        socket.emit('admin:watch', { sessionId });
      }
    });

    socket.on('participant:presence', ({ sessionId, online }: { sessionId: string; online: boolean }) => {
      if (sessionId !== selectedSessionRef.current) return;

      setParticipantOnline(online);
      if (!online) {
        setLiveStatus('offline');
        setHasRemoteStream(false);
        teardownLivePeer();
        return;
      }

      setLiveStatus('connecting');
      socket.emit('admin:watch', { sessionId });
    });

    socket.on(
      'participant:signal',
      async ({ sessionId, participantSocketId, signal }: { sessionId: string; participantSocketId: string; signal: MonitoringSignal }) => {
        if (sessionId !== selectedSessionRef.current) return;

        const peer = ensureAdminPeer(sessionId, participantSocketId);

        if ('type' in signal && signal.type === 'ice-candidate') {
          if (!peer.remoteDescription) {
            pendingIceCandidatesRef.current.push(signal.candidate);
            return;
          }

          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
          return;
        }

        if (signal.type === 'offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
          await flushPendingAdminIceCandidates(peer);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          socket.emit('admin:signal', {
            sessionId,
            targetSocketId: participantSocketId,
            signal: answer,
          });
          return;
        }

        await peer.setRemoteDescription(new RTCSessionDescription(signal));
        await flushPendingAdminIceCandidates(peer);
      },
    );

    socket.on('disconnect', () => {
      setParticipantOnline(false);
      setLiveStatus('idle');
      teardownLivePeer();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      teardownLivePeer();
    };
  }, []);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;

    const handlePlaying = () => {
      setLiveStatus('live');
    };

    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('playing', handlePlaying);
    };
  }, []);

  const inProgressCount = sessions.filter((session) => session.status === 'in_progress').length;
  const completedCount = sessions.filter((session) => session.status !== 'in_progress').length;
  const flaggedCount = sessions.filter((session) => session.violationCount > 0).length;

  const filteredSessions = useMemo(() => {
    if (mode === 'in_progress') {
      return sessions.filter((session) => session.status === 'in_progress');
    }

    if (mode === 'completed') {
      return sessions.filter((session) => session.status !== 'in_progress');
    }

    return sessions.filter((session) => session.violationCount > 0);
  }, [mode, sessions]);

  const selectedSession = useMemo(
    () => filteredSessions.find((session) => session.id === selectedSessionId) || filteredSessions[0] || null,
    [filteredSessions, selectedSessionId],
  );

  useEffect(() => {
    const stillVisible = filteredSessions.some((session) => session.id === selectedSessionId);
    if (!stillVisible) {
      setSelectedSessionId(filteredSessions[0]?.id || null);
    }
  }, [filteredSessions, selectedSessionId]);

  useEffect(() => {
    if (!selectedSession) {
      selectedSessionRef.current = null;
      setSelectedSnapshot(null);
      setParticipantOnline(false);
      setLiveStatus('idle');
      setHasRemoteStream(false);
      teardownLivePeer();
      return;
    }

    selectedSessionRef.current = selectedSession.id;
    setParticipantOnline(false);
    setHasRemoteStream(false);
    teardownLivePeer();

    if (selectedSession.status !== 'in_progress' || mode === 'completed') {
      setLiveStatus('idle');
      setSelectedSnapshot(null);
      return;
    }

    setLiveStatus('waiting');
    void loadSelectedSnapshot(selectedSession.id);
    socketRef.current?.emit('admin:join', { sessionId: selectedSession.id });
    socketRef.current?.emit('admin:watch', { sessionId: selectedSession.id });
  }, [mode, selectedSession]);

  const loadSessions = async (showLoader: boolean) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const { data: sessionRows, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (sessionError) throw sessionError;

      const sessionsData = (sessionRows || []) as TestSession[];
      const profileIds = Array.from(new Set(sessionsData.map((session) => session.user_id)));
      const packageIds = Array.from(new Set(sessionsData.map((session) => session.package_id)));
      const sessionIds = sessionsData.map((session) => session.id);

      const [profileResult, packageResult, answerResult, logResult, certificateResult] = await Promise.all([
        profileIds.length
          ? supabase.from('profiles').select('id, full_name, email').in('id', profileIds)
          : Promise.resolve({ data: [], error: null }),
        packageIds.length
          ? supabase.from('test_packages').select('id, title').in('id', packageIds)
          : Promise.resolve({ data: [], error: null }),
        sessionIds.length
          ? supabase.from('user_answers').select('id, session_id').in('session_id', sessionIds)
          : Promise.resolve({ data: [], error: null }),
        sessionIds.length
          ? supabase
              .from('proctoring_logs')
              .select('id, session_id, event_type, timestamp')
              .in('session_id', sessionIds)
              .order('timestamp', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        sessionIds.length
          ? supabase
              .from('certificates')
              .select('session_id, listening_score, structure_score, reading_score, total_score')
              .in('session_id', sessionIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (packageResult.error) throw packageResult.error;
      if (answerResult.error) throw answerResult.error;
      if (logResult.error) throw logResult.error;
      if (certificateResult.error) throw certificateResult.error;

      const profileRows = (profileResult.data || []) as ProfileLite[];
      const packageRows = (packageResult.data || []) as Array<Pick<TestPackage, 'id' | 'title'>>;
      const answerRows = (answerResult.data || []) as Array<{ id: string; session_id: string }>;
      const logRows = (logResult.data || []) as ProctoringLogLite[];
      const certificateRows = (certificateResult.data || []) as CertificateLite[];

      const profileMap = new Map<string, ProfileLite>(profileRows.map((row) => [row.id, row]));
      const packageMap = new Map<string, Pick<TestPackage, 'id' | 'title'>>(packageRows.map((row) => [row.id, row]));
      const certificateMap = new Map<string, CertificateLite>(certificateRows.map((row) => [row.session_id, row]));
      const answerCountMap = new Map<string, number>();
      const logMap = new Map<string, ProctoringLogLite[]>();

      for (const answer of answerRows) {
        answerCountMap.set(answer.session_id, (answerCountMap.get(answer.session_id) || 0) + 1);
      }

      for (const log of logRows) {
        const current = logMap.get(log.session_id) || [];
        current.push(log);
        logMap.set(log.session_id, current);
      }

      const nextSessions: SessionView[] = sessionsData.map((session) => {
        const profile = profileMap.get(session.user_id);
        const pkg = packageMap.get(session.package_id);
        const logs = logMap.get(session.id) || [];
        const violations = logs.filter((log) =>
          ['camera_blocked', 'microphone_blocked', 'tab_switch', 'face_not_detected', 'multiple_faces', 'fullscreen_exit'].includes(log.event_type),
        ).length;

        return {
          ...session,
          participantName: profile?.full_name || 'Unknown participant',
          participantEmail: profile?.email || '-',
          packageTitle: pkg?.title || 'Unknown package',
          answerCount: answerCountMap.get(session.id) || 0,
          violationCount: violations,
          latestLog: logs[0] || null,
          events: logs,
          certificate: certificateMap.get(session.id) || null,
        };
      });

      setSessions(nextSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      alert('Failed to load monitoring sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSelectedSnapshot = async (sessionId: string) => {
    setSnapshotLoading(true);
    try {
      const { data, error } = await supabase
        .from('proctoring_logs')
        .select('id, session_id, event_type, timestamp, event_data')
        .eq('session_id', sessionId)
        .eq('event_type', 'snapshot_uploaded')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSelectedSnapshot((data as SnapshotLog | null) || null);
    } catch (error) {
      console.error('Error loading snapshot:', error);
      setSelectedSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const teardownLivePeer = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingIceCandidatesRef.current = [];
  };

  const flushPendingAdminIceCandidates = async (peer: RTCPeerConnection) => {
    const candidates = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const ensureAdminPeer = (sessionId: string, participantSocketId: string) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      const video = remoteVideoRef.current;
      if (video && stream) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        setHasRemoteStream(true);
        void video.play().catch(() => {
          setLiveStatus('connecting');
        });
      }
      setLiveStatus('connecting');
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) return;

      socketRef.current.emit('admin:signal', {
        sessionId,
        targetSocketId: participantSocketId,
        signal: {
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        },
      });
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setLiveStatus((currentStatus) => (currentStatus === 'live' ? 'live' : 'connecting'));
        return;
      }

      if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
        setLiveStatus(participantOnline ? 'connecting' : 'offline');
        setHasRemoteStream(false);
        teardownLivePeer();
      }
    };

    peerConnectionRef.current = peer;
    return peer;
  };

  const markAbandoned = async (sessionId: string) => {
    if (!confirm('Mark this session as abandoned?')) return;

    try {
      const { error } = await supabase
        .from('test_sessions')
        .update({
          status: 'abandoned',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      await supabase.from('proctoring_logs').delete().eq('session_id', sessionId).eq('event_type', 'snapshot_uploaded');
      await loadSessions(false);
      setSelectedSnapshot(null);
      teardownLivePeer();
    } catch (error) {
      console.error('Error marking session abandoned:', error);
      alert('Failed to update session status.');
    }
  };

  if (loading) {
    return <div className="admin-surface p-10 text-center text-sm text-[color:var(--ink-soft)]">Loading monitoring workspace...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold">Session Control</h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">
            Active exams, finished attempts, and warning-heavy sessions now live in separate views so admins can read the room faster.
          </p>
        </div>

        <button onClick={() => void loadSessions(false)} className="secondary-btn">
          <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {MONITOR_MODES.map((item) => {
          const Icon = item.icon;
          const active = item.id === mode;
          const count = item.id === 'in_progress' ? inProgressCount : item.id === 'completed' ? completedCount : flaggedCount;

          return (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`admin-surface p-4 text-left transition-all ${active ? 'ring-2 ring-[color:var(--blue)] bg-[#eef3ff]' : 'hover:bg-[#f8f9ff]'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold text-[color:var(--ink-strong)]">{item.label}</div>
                  <div className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{item.description}</div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${active ? 'bg-[color:var(--blue)] text-white' : 'bg-[#f3f6ff] text-[color:var(--blue-deep)]'}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-5 text-4xl font-extrabold text-[color:var(--ink-strong)]">{count}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSessions.map((session) => {
              const isActive = selectedSession?.id === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`admin-surface render-lite p-4 text-left transition-all ${isActive ? 'ring-2 ring-[color:var(--blue)] bg-[#eef3ff]' : 'hover:bg-[#f8f9ff]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-extrabold text-[color:var(--ink-strong)]">{session.participantName}</div>
                      <div className="mt-1 line-clamp-1 text-xs text-[color:var(--ink-soft)]">{session.participantEmail}</div>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-[color:var(--ink-soft)]">
                    <div>Package: {session.packageTitle}</div>
                    <div>Session: {session.id.slice(0, 8)}</div>
                    <div>{mode === 'completed' ? 'Finished' : 'Started'}: {new Date(session.started_at).toLocaleString()}</div>
                    <div>Answers: {session.answerCount}</div>
                    <div>Warnings: {session.violationCount}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredSessions.length === 0 && (
            <div className="admin-surface p-8 text-center text-sm text-[color:var(--ink-soft)]">
              {mode === 'in_progress' ? 'No active sessions right now.' : mode === 'completed' ? 'No completed session history yet.' : 'No warning sessions yet.'}
            </div>
          )}
        </div>

        <div className="admin-surface p-5 sm:p-6">
          {selectedSession ? (
            mode === 'completed' ? renderHistoryDetail(selectedSession) : renderMonitorDetail(selectedSession, {
              selectedSnapshot,
              snapshotLoading,
              participantOnline,
              liveStatus,
              hasRemoteStream,
              remoteVideoRef,
              onMarkAbandoned: markAbandoned,
            })
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[20px] bg-[#f8f9ff] p-6 text-center">
              <UserSquare2 className="h-12 w-12 text-[color:var(--ink-soft)]" />
              <div className="mt-4 text-xl font-extrabold text-[color:var(--ink-strong)]">Select a session</div>
              <p className="mt-2 max-w-sm text-sm leading-7 text-[color:var(--ink-soft)]">
                Pick one session card to inspect participant detail, live monitoring, or session history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderMonitorDetail(
  selectedSession: SessionView,
  input: {
    selectedSnapshot: SnapshotLog | null;
    snapshotLoading: boolean;
    participantOnline: boolean;
    liveStatus: 'idle' | 'waiting' | 'connecting' | 'live' | 'offline';
    hasRemoteStream: boolean;
    remoteVideoRef: React.RefObject<HTMLVideoElement>;
    onMarkAbandoned: (sessionId: string) => Promise<void>;
  },
) {
  const showLivePanel = selectedSession.status === 'in_progress';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-extrabold">{selectedSession.participantName}</h3>
          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{selectedSession.participantEmail}</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">Package: {selectedSession.packageTitle}</p>
        </div>
        {showLivePanel && (
          <button onClick={() => void input.onMarkAbandoned(selectedSession.id)} className="danger-btn">
            <CircleOff className="h-4 w-4" />
            Mark Abandoned
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Started" value={new Date(selectedSession.started_at).toLocaleString()} />
        <MetricCard label="Progress" value={`${selectedSession.answerCount} answers saved`} />
        <MetricCard label="Warnings" value={`${selectedSession.violationCount} violation events`} />
        <MetricCard label="Latest Event" value={selectedSession.latestLog ? formatEventLabel(selectedSession.latestLog.event_type) : 'No event yet'} />
      </div>

      {showLivePanel ? (
        <div className="admin-soft-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-[color:var(--ink-strong)]">
            <div className="flex items-center gap-2">
              <MonitorPlay className="h-4 w-4" />
              Participant Camera Preview
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${input.liveStatus === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              <Radio className={`h-3.5 w-3.5 ${input.liveStatus === 'live' ? 'animate-pulse' : ''}`} />
              {input.liveStatus === 'live'
                ? 'Live'
                : input.liveStatus === 'connecting'
                ? 'Connecting'
                : input.liveStatus === 'waiting'
                ? 'Waiting'
                : input.liveStatus === 'offline'
                ? 'Offline'
                : 'Idle'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="overflow-hidden rounded-[20px] border border-[rgba(119,123,179,0.14)] bg-black">
              <video ref={input.remoteVideoRef} autoPlay playsInline muted className={`h-56 w-full object-cover ${input.hasRemoteStream ? 'block' : 'hidden'}`} />
              {!input.hasRemoteStream && input.selectedSnapshot?.event_data?.imageData ? (
                <img
                  src={input.selectedSnapshot.event_data.imageData}
                  alt={`Latest fallback preview for ${selectedSession.participantName}`}
                  className="h-56 w-full object-cover opacity-80"
                />
              ) : null}
              {!input.hasRemoteStream && !input.selectedSnapshot?.event_data?.imageData && (
                <div className="flex h-56 items-center justify-center text-sm text-slate-300">
                  {input.snapshotLoading
                    ? 'Loading fallback preview...'
                    : input.participantOnline
                    ? 'Waiting for live stream handshake...'
                    : 'Participant camera is not connected yet.'}
                </div>
              )}
              <div className="bg-white px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                {input.hasRemoteStream
                  ? 'Realtime camera stream active.'
                  : input.selectedSnapshot?.timestamp
                  ? `Fallback snapshot at ${new Date(input.selectedSnapshot.timestamp).toLocaleString()}`
                  : 'No fallback snapshot available yet.'}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[color:var(--ink-soft)]">
              <Camera className="h-3.5 w-3.5" />
              <span>{input.participantOnline ? 'Participant connected to live monitor.' : 'Participant not connected to live monitor.'}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-soft-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--ink-strong)]">
          <AlertTriangle className="h-4 w-4" />
          Session Event Timeline
        </div>
        <div className="space-y-3">
          {selectedSession.events.slice(0, 10).map((event) => (
            <div key={event.id} className="rounded-[18px] bg-white px-4 py-3 text-sm text-[color:var(--ink-strong)]">
              <div className="font-semibold">{formatEventLabel(event.event_type)}</div>
              <div className="mt-1 text-xs text-[color:var(--ink-soft)]">{new Date(event.timestamp).toLocaleString()}</div>
            </div>
          ))}
          {selectedSession.events.length === 0 && <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-[color:var(--ink-soft)]">No event log captured for this session.</div>}
        </div>
      </div>
    </div>
  );
}

function renderHistoryDetail(selectedSession: SessionView) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-extrabold">{selectedSession.participantName}</h3>
        <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{selectedSession.participantEmail}</p>
        <p className="mt-2 text-sm text-[color:var(--ink-soft)]">Package: {selectedSession.packageTitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Session ID" value={selectedSession.id} compact />
        <MetricCard label="Status" value={selectedSession.status} />
        <MetricCard label="Started" value={new Date(selectedSession.started_at).toLocaleString()} />
        <MetricCard label="Completed" value={selectedSession.completed_at ? new Date(selectedSession.completed_at).toLocaleString() : 'Not recorded'} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricTile label="Answers" value={selectedSession.answerCount} />
        <MetricTile label="Warnings" value={selectedSession.violationCount} />
        <MetricTile label="Total Score" value={selectedSession.certificate?.total_score ?? '-'} />
        <MetricTile label="Package" value={selectedSession.packageTitle} small />
      </div>

      <div className="admin-soft-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--ink-strong)]">
          <History className="h-4 w-4" />
          Score Breakdown For This Session
        </div>
        {selectedSession.certificate ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Listening" value={selectedSession.certificate.listening_score} />
            <MetricTile label="Structure" value={selectedSession.certificate.structure_score} />
            <MetricTile label="Reading" value={selectedSession.certificate.reading_score} />
          </div>
        ) : (
          <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-[color:var(--ink-soft)]">No score certificate stored for this session yet.</div>
        )}
      </div>

      <div className="admin-soft-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--ink-strong)]">
          <AlertTriangle className="h-4 w-4" />
          Session Timeline
        </div>
        <div className="space-y-3">
          {selectedSession.events.slice(0, 12).map((event) => (
            <div key={event.id} className="rounded-[18px] bg-white px-4 py-3 text-sm text-[color:var(--ink-strong)]">
              <div className="font-semibold">{formatEventLabel(event.event_type)}</div>
              <div className="mt-1 text-xs text-[color:var(--ink-soft)]">{new Date(event.timestamp).toLocaleString()}</div>
            </div>
          ))}
          {selectedSession.events.length === 0 && <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-[color:var(--ink-soft)]">No session events stored for this attempt.</div>}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="admin-soft-surface p-4">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">{label}</div>
      <div className={`mt-2 font-semibold text-[color:var(--ink-strong)] ${compact ? 'text-xs break-all leading-6' : 'text-sm'}`}>{value}</div>
    </div>
  );
}

function MetricTile({ label, value, small = false }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="rounded-[20px] bg-[#f7f8ff] px-4 py-4">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">{label}</div>
      <div className={`mt-3 font-extrabold text-[color:var(--ink-strong)] ${small ? 'text-base leading-6' : 'text-3xl'}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: TestSession['status'] }) {
  const styles =
    status === 'completed'
      ? 'bg-[#dbfff0] text-[#127548]'
      : status === 'abandoned'
      ? 'bg-[#ffe9ee] text-[#bc3f63]'
      : 'bg-[color:var(--blue-soft)] text-[color:var(--blue-deep)]';

  return <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${styles}`}>{status}</span>;
}

function formatEventLabel(eventType: string) {
  switch (eventType) {
    case 'camera_blocked':
      return 'Camera access interrupted';
    case 'microphone_blocked':
      return 'Microphone access interrupted';
    case 'tab_switch':
      return 'Browser tab switch detected';
    case 'face_not_detected':
      return 'Face not detected';
    case 'multiple_faces':
      return 'Multiple faces detected';
    case 'session_started':
      return 'Session started';
    case 'session_ended':
      return 'Session ended';
    case 'snapshot_uploaded':
      return 'Snapshot uploaded';
    case 'fullscreen_exit':
      return 'Fullscreen exited';
    default:
      return eventType;
  }
}
