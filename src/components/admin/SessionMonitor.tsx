import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, CircleOff, MonitorPlay, RefreshCcw, UserSquare2 } from 'lucide-react';
import { TestPackage, TestSession, supabase } from '../../lib/supabase';

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

type SessionView = TestSession & {
  participantName: string;
  participantEmail: string;
  packageTitle: string;
  answerCount: number;
  violationCount: number;
  latestLog: ProctoringLogLite | null;
};

export function SessionMonitor() {
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | TestSession['status']>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotLog | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  useEffect(() => {
    void loadSessions(true);

    const interval = window.setInterval(() => {
      void loadSessions(false);
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  const filteredSessions = useMemo(() => {
    if (statusFilter === 'all') return sessions;
    return sessions.filter((session) => session.status === statusFilter);
  }, [sessions, statusFilter]);

  const selectedSession = useMemo(
    () => filteredSessions.find((session) => session.id === selectedSessionId) || filteredSessions[0] || null,
    [filteredSessions, selectedSessionId],
  );

  useEffect(() => {
    if (!selectedSession && selectedSessionId !== null) {
      setSelectedSessionId(null);
      setSelectedSnapshot(null);
      return;
    }

    if (!selectedSession) {
      setSelectedSnapshot(null);
      return;
    }

    setSelectedSessionId(selectedSession.id);

    if (selectedSession.status !== 'in_progress') {
      setSelectedSnapshot(null);
      return;
    }

    void loadSelectedSnapshot(selectedSession.id);
  }, [selectedSession, selectedSessionId]);

  const inProgressCount = sessions.filter((session) => session.status === 'in_progress').length;
  const completedCount = sessions.filter((session) => session.status === 'completed').length;
  const flaggedCount = sessions.filter((session) => session.violationCount > 0).length;

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

      const sessionsData = sessionRows || [];
      const profileIds = Array.from(new Set(sessionsData.map((session: TestSession) => session.user_id)));
      const packageIds = Array.from(new Set(sessionsData.map((session: TestSession) => session.package_id)));
      const sessionIds = sessionsData.map((session: TestSession) => session.id);

      const [profileResult, packageResult, answerResult, logResult] = await Promise.all([
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
      ]);

      if (profileResult.error) throw profileResult.error;
      if (packageResult.error) throw packageResult.error;
      if (answerResult.error) throw answerResult.error;
      if (logResult.error) throw logResult.error;

      const profileRows = (profileResult.data || []) as ProfileLite[];
      const packageRows = (packageResult.data || []) as Array<Pick<TestPackage, 'id' | 'title'>>;
      const answerRows = (answerResult.data || []) as Array<{ id: string; session_id: string }>;
      const logRows = (logResult.data || []) as ProctoringLogLite[];

      const profileMap = new Map<string, ProfileLite>(profileRows.map((row) => [row.id, row]));
      const packageMap = new Map<string, Pick<TestPackage, 'id' | 'title'>>(packageRows.map((row) => [row.id, row]));
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

      const nextSessions: SessionView[] = sessionsData.map((session: TestSession) => {
        const profile = profileMap.get(session.user_id);
        const pkg = packageMap.get(session.package_id);
        const logs = logMap.get(session.id) || [];
        const violations = logs.filter((log) =>
          ['camera_blocked', 'microphone_blocked', 'tab_switch', 'face_not_detected', 'multiple_faces', 'fullscreen_exit'].includes(
            log.event_type,
          ),
        ).length;

        return {
          ...session,
          participantName: profile?.full_name || 'Unknown participant',
          participantEmail: profile?.email || '-',
          packageTitle: pkg?.title || 'Unknown package',
          answerCount: answerCountMap.get(session.id) || 0,
          violationCount: violations,
          latestLog: logs[0] || null,
        };
      });

      setSessions(nextSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      alert('Failed to load live sessions.');
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
    } catch (error) {
      console.error('Error marking session abandoned:', error);
      alert('Failed to update session status.');
    }
  };

  if (loading) {
    return <div className="admin-surface p-10 text-center text-sm text-[color:var(--ink-soft)]">Loading sessions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold">Live Sessions</h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">
            Default view is compact so many participants remain visible. Click any participant for detail.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | TestSession['status'])}
            className="field-input min-w-[190px]"
          >
            <option value="all">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>

          <button onClick={() => void loadSessions(false)} className="secondary-btn">
            <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="In Progress" value={inProgressCount} tone="blue" />
        <SummaryCard label="Completed" value={completedCount} tone="green" />
        <SummaryCard label="Sessions With Violations" value={flaggedCount} tone="amber" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSessions.map((session) => {
              const isActive = selectedSession?.id === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`admin-surface render-lite p-4 text-left transition-all ${
                    isActive ? 'ring-2 ring-[color:var(--blue)] bg-[#eef3ff]' : 'hover:bg-[#f8f9ff]'
                  }`}
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
                    <div>Answers: {session.answerCount}</div>
                    <div>Warnings: {session.violationCount}</div>
                    <div>Time left: {formatDuration(session.time_remaining_seconds)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredSessions.length === 0 && (
            <div className="admin-surface p-8 text-center text-sm text-[color:var(--ink-soft)]">
              No sessions match the current filter.
            </div>
          )}
        </div>

        <div className="admin-surface p-5 sm:p-6">
          {selectedSession ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-extrabold">{selectedSession.participantName}</h3>
                  <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{selectedSession.participantEmail}</p>
                  <p className="mt-2 text-sm text-[color:var(--ink-soft)]">Package: {selectedSession.packageTitle}</p>
                </div>
                {selectedSession.status === 'in_progress' && (
                  <button onClick={() => void markAbandoned(selectedSession.id)} className="danger-btn">
                    <CircleOff className="h-4 w-4" />
                    Mark Abandoned
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="admin-soft-surface p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">Started</div>
                  <div className="mt-2 text-sm font-semibold text-[color:var(--ink-strong)]">{new Date(selectedSession.started_at).toLocaleString()}</div>
                </div>
                <div className="admin-soft-surface p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">Progress</div>
                  <div className="mt-2 text-sm font-semibold text-[color:var(--ink-strong)]">{selectedSession.answerCount} answers saved</div>
                </div>
                <div className="admin-soft-surface p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">Warnings</div>
                  <div className="mt-2 text-sm font-semibold text-[color:var(--ink-strong)]">{selectedSession.violationCount} violation events</div>
                </div>
                <div className="admin-soft-surface p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">Latest Event</div>
                  <div className="mt-2 text-sm font-semibold text-[color:var(--ink-strong)]">
                    {selectedSession.latestLog ? formatEventLabel(selectedSession.latestLog.event_type) : 'No event yet'}
                  </div>
                </div>
              </div>

              <div className="admin-soft-surface p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--ink-strong)]">
                  <MonitorPlay className="h-4 w-4" />
                  Participant Camera Preview
                </div>
                {selectedSession.status !== 'in_progress' ? (
                  <div className="rounded-[18px] bg-white p-4 text-sm text-[color:var(--ink-soft)]">
                    Session history does not retain camera preview. Snapshot/live preview is only shown while the participant is still in progress.
                  </div>
                ) : snapshotLoading ? (
                  <div className="rounded-[18px] bg-white p-4 text-sm text-[color:var(--ink-soft)]">Loading live preview...</div>
                ) : selectedSnapshot?.event_data?.imageData ? (
                  <div className="overflow-hidden rounded-[20px] border border-[rgba(119,123,179,0.14)] bg-black">
                    <img
                      src={selectedSnapshot.event_data.imageData}
                      alt={`Live preview for ${selectedSession.participantName}`}
                      className="h-56 w-full object-cover"
                    />
                    <div className="bg-white px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                      Latest preview at {new Date(selectedSnapshot.timestamp).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[18px] bg-white p-4 text-sm text-[color:var(--ink-soft)]">
                    No preview available yet. Refresh after the participant has been in session for a few seconds.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[20px] bg-[#f8f9ff] p-6 text-center">
              <UserSquare2 className="h-12 w-12 text-[color:var(--ink-soft)]" />
              <div className="mt-4 text-xl font-extrabold text-[color:var(--ink-strong)]">Select a participant</div>
              <p className="mt-2 max-w-sm text-sm leading-7 text-[color:var(--ink-soft)]">
                Click any compact participant card on the left to inspect status, violations, and live preview.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'amber' }) {
  const toneClass =
    tone === 'blue'
      ? 'bg-[#edf2ff] text-[color:var(--blue-deep)]'
      : tone === 'green'
      ? 'bg-[#ecfff5] text-[#127548]'
      : 'bg-[#fff4db] text-[#9a6204]';

  return (
    <div className={`admin-soft-surface p-5 ${toneClass}`}>
      <div className="text-xs font-bold uppercase tracking-[0.24em]">{label}</div>
      <div className="mt-3 text-4xl font-extrabold">{value}</div>
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

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
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
