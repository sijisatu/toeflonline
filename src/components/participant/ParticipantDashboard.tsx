import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, TestPackage } from '../../lib/supabase';
import { ArrowRight, BookOpen, Clock3, LogOut, ShieldCheck, Sparkles } from 'lucide-react';

export function ParticipantDashboard() {
  const { profile, signOut } = useAuth();
  const [packages, setPackages] = useState<TestPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase.from('test_packages').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTest = (packageId: string) => {
    window.location.href = `/test/${packageId}`;
  };

  return (
    <div className="page-backdrop py-4 sm:py-6">
      <div className="shell-wrap space-y-5 sm:space-y-6">
        <header className="glass-card px-4 py-5 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="eyebrow">Participant Workspace</span>
              <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">The Lucid Scholar</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] md:text-base">
                Welcome back, {profile?.full_name}. Choose an active test package and enter a calmer, more focused exam environment.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="soft-card flex items-center gap-3 px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--blue-soft)] text-[color:var(--blue-deep)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">Mode</div>
                  <div className="text-sm font-semibold text-[color:var(--ink-strong)]">Exam Ready</div>
                </div>
              </div>

              <button onClick={() => signOut()} className="secondary-btn w-full sm:w-auto">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-card overflow-hidden p-5 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="metric-card">
                <div className="metric-label">Active Packages</div>
                <div className="metric-value">{packages.length}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Monitoring</div>
                <div className="mt-3 flex items-center gap-2 text-lg font-bold text-[color:var(--ink-strong)]">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  Enabled
                </div>
              </div>
              <div className="metric-card sm:col-span-2 md:col-span-1">
                <div className="metric-label">Exam Style</div>
                <div className="mt-3 text-lg font-bold text-[color:var(--ink-strong)]">TOEFL ITP</div>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] bg-gradient-to-r from-[#eaf0ff] to-[#f7f3ff] p-5 sm:mt-8 sm:rounded-[28px] sm:p-6">
              <div className="text-sm font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">Before You Start</div>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-[color:var(--ink-main)] md:grid-cols-2">
                <div className="rounded-[20px] bg-white/80 px-4 py-4">Keep camera and microphone enabled for the whole session.</div>
                <div className="rounded-[20px] bg-white/80 px-4 py-4">Avoid tab switching and keep a stable browser window.</div>
                <div className="rounded-[20px] bg-white/80 px-4 py-4">Read the section instructions before starting audio-based items.</div>
                <div className="rounded-[20px] bg-white/80 px-4 py-4">Use the navigation view to track answered and flagged questions.</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 sm:p-8">
            <div className="eyebrow">Experience Note</div>
            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">A softer interface for a long exam.</h2>
            <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">
              The participant side now leans into rounded surfaces, softer contrast, and clearer hierarchy so the test feels intentional instead of generic.
            </p>
            <div className="mt-6 rounded-[24px] bg-[linear-gradient(135deg,#2457e7,#14389a)] p-5 text-white shadow-[0_18px_40px_rgba(26,57,157,0.28)] sm:rounded-[26px] sm:p-6">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/72">Focus Pattern</div>
              <div className="mt-3 text-xl font-extrabold leading-tight sm:text-2xl">Navigate, listen, answer, review.</div>
              <p className="mt-4 text-sm leading-7 text-white/84">Each screen is being shaped around those four actions so the exam has rhythm.</p>
            </div>
          </div>
        </section>

        <section className="glass-card p-5 sm:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="eyebrow">Available Tests</span>
              <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">Choose your next session</h2>
              <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">Active packages are surfaced below with clearer timing and actions.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d7e1ff] border-t-[color:var(--blue)]" />
              <p className="mt-4 text-sm text-[color:var(--ink-soft)]">Loading active packages...</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-2 xl:gap-5">
              {packages.map((pkg, index) => (
                <article key={pkg.id} className="glass-card-strong overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-1 sm:p-6">
                  <div className="flex flex-col gap-5">
                    <div className="max-w-xl">
                      <div className="inline-flex rounded-full bg-[color:var(--blue-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--blue-deep)]">
                        Package {String(index + 1).padStart(2, '0')}
                      </div>
                      <h3 className="mt-4 text-xl font-extrabold sm:text-2xl">{pkg.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
                        {pkg.description || 'Full practice package with multi-section TOEFL flow and timed monitoring.'}
                      </p>
                    </div>

                    <div className="soft-card p-4 sm:max-w-[240px]">
                      <div className="flex items-center gap-3 text-sm font-semibold text-[color:var(--ink-strong)]">
                        <Clock3 className="h-4 w-4 text-[color:var(--blue-deep)]" />
                        {pkg.duration_minutes} minutes
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-sm font-semibold text-[color:var(--ink-strong)]">
                        <BookOpen className="h-4 w-4 text-[color:var(--blue-deep)]" />
                        Proctored session
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[color:var(--ink-soft)]">Participant monitoring is enabled for this package.</div>
                    <button onClick={() => startTest(pkg.id)} className="primary-btn w-full sm:w-auto">
                      Start Test
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}

              {packages.length === 0 && (
                <div className="glass-card-strong col-span-full p-10 text-center sm:p-12">
                  <BookOpen className="mx-auto h-16 w-16 text-[#9aa7d5]" />
                  <h3 className="mt-5 text-2xl font-extrabold">No active tests yet</h3>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">Ask the admin to activate at least one package before participants begin.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
