import { useEffect, useMemo, useState } from 'react';
import { Download, Trophy } from 'lucide-react';
import { Certificate, supabase } from '../../lib/supabase';

type ProfileLite = {
  id: string;
  full_name: string;
  email: string;
};

type PackageLite = {
  id: string;
  title: string;
};

type ReportRow = Certificate & {
  participantName: string;
  participantEmail: string;
  packageTitle: string;
};

export function ReportsView() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return reports;

    return reports.filter((report) =>
      [report.participantName, report.participantEmail, report.packageTitle, String(report.total_score)]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [reports, search]);

  const totalAttempts = reports.length;
  const highestScore = reports.reduce((max, item) => Math.max(max, item.total_score), 0);
  const averageScore =
    totalAttempts === 0
      ? 0
      : Math.round(reports.reduce((sum, item) => sum + item.total_score, 0) / totalAttempts);
  const averageListening =
    totalAttempts === 0
      ? 0
      : Math.round(reports.reduce((sum, item) => sum + item.listening_score, 0) / totalAttempts);
  const averageStructure =
    totalAttempts === 0
      ? 0
      : Math.round(reports.reduce((sum, item) => sum + item.structure_score, 0) / totalAttempts);
  const averageReading =
    totalAttempts === 0
      ? 0
      : Math.round(reports.reduce((sum, item) => sum + item.reading_score, 0) / totalAttempts);

  const loadReports = async () => {
    setLoading(true);

    try {
      const { data: certificateRows, error: certificateError } = await supabase.from('certificates').select('*').order('generated_at', {
        ascending: false,
      });

      if (certificateError) throw certificateError;

      const certificates = certificateRows || [];
      const userIds = Array.from(new Set(certificates.map((row) => row.user_id)));
      const packageIds = Array.from(new Set(certificates.map((row) => row.package_id)));
      const [profileResult, packageResult] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('id, full_name, email').in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
        packageIds.length
          ? supabase.from('test_packages').select('id, title').in('id', packageIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (packageResult.error) throw packageResult.error;

      const profileRows = (profileResult.data || []) as ProfileLite[];
      const packageRows = (packageResult.data || []) as PackageLite[];

      const profileMap = new Map<string, ProfileLite>(profileRows.map((row) => [row.id, row]));
      const packageMap = new Map<string, PackageLite>(packageRows.map((row) => [row.id, row]));

      const nextReports: ReportRow[] = certificates.map((certificate) => ({
        ...certificate,
        participantName: profileMap.get(certificate.user_id)?.full_name || 'Unknown participant',
        participantEmail: profileMap.get(certificate.user_id)?.email || '-',
        packageTitle: packageMap.get(certificate.package_id)?.title || 'Unknown package',
      }));

      setReports(nextReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      alert('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = [
      'Participant Name',
      'Participant Email',
      'Package',
      'Listening',
      'Structure',
      'Reading',
      'Total',
      'Generated At',
    ];

    const rows = filteredReports.map((report) => [
      report.participantName,
      report.participantEmail,
      report.packageTitle,
      report.listening_score,
      report.structure_score,
      report.reading_score,
      report.total_score,
      new Date(report.generated_at).toLocaleString(),
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'toefl-reports.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="admin-surface p-10 text-center text-sm text-[color:var(--ink-soft)]">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold">Reports</h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">Review results, trends, and export score data.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search participant, package, or score"
            className="field-input min-w-[260px]"
          />
          <button
            onClick={exportCsv}
            disabled={filteredReports.length === 0}
            className="secondary-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Total Attempts" value={totalAttempts} />
        <MetricCard label="Average Total Score" value={averageScore} />
        <MetricCard label="Highest Score" value={highestScore} />
        <MetricCard label="Listening Avg" value={averageListening} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Structure Average" value={averageStructure} />
        <SectionCard title="Reading Average" value={averageReading} />
      </div>

      <div className="admin-surface overflow-hidden">
        <div className="border-b border-[rgba(119,123,179,0.14)] px-6 py-4">
          <h3 className="text-xl font-extrabold">Recent Results</h3>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-sm text-[color:var(--ink-soft)]">No reports found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[rgba(119,123,179,0.14)] text-sm">
              <thead className="bg-white/60">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-[color:var(--ink-soft)]">Participant</th>
                  <th className="px-6 py-3 text-left font-semibold text-[color:var(--ink-soft)]">Package</th>
                  <th className="px-6 py-3 text-left font-semibold text-[color:var(--ink-soft)]">Listening</th>
                  <th className="px-6 py-3 text-left font-semibold text-[color:var(--ink-soft)]">Structure</th>
                  <th className="px-6 py-3 text-left font-semibold text-[color:var(--ink-soft)]">Reading</th>
                  <th className="px-6 py-3 text-left font-semibold text-[color:var(--ink-soft)]">Total</th>
                  <th className="px-6 py-3 text-left font-semibold text-[color:var(--ink-soft)]">Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(119,123,179,0.14)] bg-white/72">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="render-lite transition-colors hover:bg-white">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[color:var(--ink-strong)]">{report.participantName}</div>
                      <div className="text-[color:var(--ink-soft)]">{report.participantEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-[color:var(--ink-main)]">{report.packageTitle}</td>
                    <td className="px-6 py-4 text-[color:var(--ink-main)]">{report.listening_score}</td>
                    <td className="px-6 py-4 text-[color:var(--ink-main)]">{report.structure_score}</td>
                    <td className="px-6 py-4 text-[color:var(--ink-main)]">{report.reading_score}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--blue-soft)] px-3 py-1 font-semibold text-[color:var(--blue-deep)]">
                        <Trophy className="h-4 w-4" />
                        {report.total_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[color:var(--ink-soft)]">{new Date(report.generated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-soft-surface p-5">
      <div className="text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">{label}</div>
      <div className="mt-3 text-4xl font-extrabold text-[color:var(--ink-strong)]">{value}</div>
    </div>
  );
}

function SectionCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="admin-soft-surface p-5">
      <div className="text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--blue-deep)]">{title}</div>
      <div className="mt-3 text-4xl font-extrabold text-[color:var(--ink-strong)]">{value}</div>
    </div>
  );
}
