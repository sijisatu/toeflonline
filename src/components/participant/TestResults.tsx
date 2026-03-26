import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Certificate } from '../../lib/supabase';
import { ArrowLeft, Award, CheckCircle2, Headphones, Library, ScrollText } from 'lucide-react';

export function TestResults() {
  const { profile } = useAuth();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchLatestCertificate();
  }, []);

  const fetchLatestCertificate = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', profile.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCertificate(data);
    } catch (error) {
      console.error('Error fetching certificate:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-backdrop flex items-center justify-center px-4">
        <div className="glass-card-strong w-full max-w-md p-10 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#d7e1ff] border-t-[color:var(--blue)]" />
          <p className="mt-6 text-sm text-[color:var(--ink-soft)]">Preparing your certificate...</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="page-backdrop flex items-center justify-center px-4">
        <div className="glass-card-strong max-w-lg p-10 text-center">
          <h2 className="text-3xl font-extrabold">No results found</h2>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">
            This account does not have a generated certificate yet.
          </p>
          <button onClick={() => (window.location.href = '/')} className="primary-btn mt-8">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-backdrop py-8">
      <div className="shell-wrap space-y-6">
        <button onClick={() => (window.location.href = '/')} className="secondary-btn">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <section className="glass-card-strong overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="eyebrow">Result Summary</span>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#def8ea] text-[#16955e]">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold">Test Completed</h1>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">
                    Your latest TOEFL ITP practice result has been recorded.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[34px] bg-[linear-gradient(135deg,#2457e7,#1738a2)] p-8 text-white shadow-[0_24px_46px_rgba(23,56,162,0.3)]">
                <div className="flex items-center gap-3">
                  <Award className="h-7 w-7" />
                  <div className="text-xl font-extrabold">TOEFL ITP Score</div>
                </div>
                <div className="mt-8 text-7xl font-extrabold leading-none">{certificate.total_score}</div>
                <div className="mt-3 text-sm uppercase tracking-[0.26em] text-white/72">Total Score</div>
              </div>
            </div>

            <div className="space-y-4">
              <ScoreCard icon={<Headphones className="h-5 w-5" />} label="Listening" value={certificate.listening_score} />
              <ScoreCard icon={<Library className="h-5 w-5" />} label="Structure" value={certificate.structure_score} />
              <ScoreCard icon={<ScrollText className="h-5 w-5" />} label="Reading" value={certificate.reading_score} />

              <div className="rounded-[28px] bg-[#fff3d7] p-5 text-sm leading-7 text-[color:var(--ink-main)]">
                This is a practice certificate for internal evaluation. It should not be treated as an official TOEFL
                score report.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ScoreCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="glass-card flex items-center gap-4 p-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[color:var(--blue-soft)] text-[color:var(--blue-deep)]">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">{label}</div>
        <div className="mt-2 text-3xl font-extrabold text-[color:var(--ink-strong)]">{value}</div>
      </div>
    </div>
  );
}
