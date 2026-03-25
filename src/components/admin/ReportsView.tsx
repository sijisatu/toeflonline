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
      const { data: certificateRows, error: certificateError } = await supabase
        .from('certificates')
        .select('*')
        .order('generated_at', { ascending: false });

      if (certificateError) throw certificateError;

      const certificates = certificateRows || [];
      const userIds = Array.from(new Set(certificates.map((row) => row.user_id)));
      const packageIds = Array.from(new Set(certificates.map((row) => row.package_id)));

      let profileRows: ProfileLite[] = [];
      if (userIds.length) {
        const { data, error } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
        if (error) throw error;
        profileRows = data || [];
      }

      let packageRows: PackageLite[] = [];
      if (packageIds.length) {
        const { data, error } = await supabase.from('test_packages').select('id, title').in('id', packageIds);
        if (error) throw error;
        packageRows = data || [];
      }

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
    return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-600">Review results, trends, and export score data.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search participant, package, or score"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={exportCsv}
            disabled={filteredReports.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
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

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Results</h3>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-600">No reports found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Participant</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Package</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Listening</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Structure</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Reading</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Total</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{report.participantName}</div>
                      <div className="text-gray-500">{report.participantEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{report.packageTitle}</td>
                    <td className="px-6 py-4 text-gray-700">{report.listening_score}</td>
                    <td className="px-6 py-4 text-gray-700">{report.structure_score}</td>
                    <td className="px-6 py-4 text-gray-700">{report.reading_score}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700">
                        <Trophy className="h-4 w-4" />
                        {report.total_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{new Date(report.generated_at).toLocaleString()}</td>
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function SectionCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-blue-50 p-5 shadow-sm">
      <div className="text-sm font-medium text-blue-700">{title}</div>
      <div className="mt-2 text-3xl font-bold text-blue-900">{value}</div>
    </div>
  );
}
