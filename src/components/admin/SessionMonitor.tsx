import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, CircleOff, RefreshCcw } from 'lucide-react';
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

      const profileIds = Array.from(new Set(sessionsData.map((session) => session.user_id)));
      const packageIds = Array.from(new Set(sessionsData.map((session) => session.package_id)));
      const sessionIds = sessionsData.map((session) => session.id);

      let profileRows: ProfileLite[] = [];
      if (profileIds.length) {
        const { data, error } = await supabase.from('profiles').select('id, full_name, email').in('id', profileIds);
        if (error) throw error;
        profileRows = data || [];
      }

      let packageRows: Array<Pick<TestPackage, 'id' | 'title'>> = [];
      if (packageIds.length) {
        const { data, error } = await supabase.from('test_packages').select('id, title').in('id', packageIds);
        if (error) throw error;
        packageRows = data || [];
      }

      let answerRows: Array<{ id: string; session_id: string }> = [];
      if (sessionIds.length) {
        const { data, error } = await supabase.from('user_answers').select('id, session_id').in('session_id', sessionIds);
        if (error) throw error;
        answerRows = data || [];
      }

      let logRows: ProctoringLogLite[] = [];
      if (sessionIds.length) {
        const { data, error } = await supabase
          .from('proctoring_logs')
          .select('id, session_id, event_type, timestamp')
          .in('session_id', sessionIds)
          .order('timestamp', { ascending: false });
        if (error) throw error;
        logRows = data || [];
      }

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

      const nextSessions: SessionView[] = sessionsData.map((session) => {
        const profile = profileMap.get(session.user_id);
        const pkg = packageMap.get(session.package_id);
        const logs = logMap.get(session.id) || [];
        const violations = logs.filter((log) =>
          ['camera_blocked', 'microphone_blocked', 'tab_switch', 'face_not_detected', 'multiple_faces'].includes(
            log.event_type
          )
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

      await loadSessions(false);
    } catch (error) {
      console.error('Error marking session abandoned:', error);
      alert('Failed to update session status.');
    }
  };

  if (loading) {
    return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">Loading sessions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Sessions</h2>
          <p className="text-sm text-gray-600">Track active attempts, proctoring events, and session status.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | TestSession['status'])}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>

          <button
            onClick={() => void loadSessions(false)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800"
          >
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

      <div className="space-y-4">
        {filteredSessions.map((session) => (
          <div key={session.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{session.participantName}</h3>
                  <StatusBadge status={session.status} />
                </div>
                <div className="text-sm text-gray-600">{session.participantEmail}</div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>Package: {session.packageTitle}</span>
                  <span>Started: {new Date(session.started_at).toLocaleString()}</span>
                  <span>Answers saved: {session.answerCount}</span>
                  <span>Time left: {formatDuration(session.time_remaining_seconds)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {session.status === 'in_progress' && (
                  <button
                    onClick={() => void markAbandoned(session.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <CircleOff className="h-4 w-4" />
                    Mark Abandoned
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 text-sm font-semibold text-gray-900">Proctoring summary</div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>{session.violationCount} warning events</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-gray-500" />
                    <span>{session.proctoring_enabled ? 'Camera/mic required' : 'Proctoring disabled'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 lg:col-span-2">
                <div className="mb-2 text-sm font-semibold text-gray-900">Latest event</div>
                {session.latestLog ? (
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="font-medium text-gray-900">{formatEventLabel(session.latestLog.event_type)}</div>
                    <div>{new Date(session.latestLog.timestamp).toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No proctoring logs recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
            No sessions match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'amber' }) {
  const toneClass =
    tone === 'blue'
      ? 'bg-blue-50 text-blue-800'
      : tone === 'green'
      ? 'bg-green-50 text-green-800'
      : 'bg-amber-50 text-amber-800';

  return (
    <div className={`rounded-xl border border-gray-200 p-5 shadow-sm ${toneClass}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: TestSession['status'] }) {
  const styles =
    status === 'completed'
      ? 'bg-green-100 text-green-700'
      : status === 'abandoned'
      ? 'bg-red-100 text-red-700'
      : 'bg-blue-100 text-blue-700';

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
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
    default:
      return eventType;
  }
}
