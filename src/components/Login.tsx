import { FormEvent, ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resetLocalDemoData } from '../lib/supabase';
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!fullName.trim()) {
          throw new Error('Full name is required');
        }
        await signUp(email, password, fullName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-backdrop flex items-center px-4 py-10">
      <div className="shell-wrap grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="glass-card relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

          <span className="eyebrow">New Exam Experience</span>
          <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-[1.02] text-[color:var(--ink-strong)]">
            TOEFL testing that feels calm, sharp, and premium.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--ink-soft)] md:text-lg">
            We are redesigning the platform around a cleaner exam rhythm: guided sections, live proctoring,
            admin oversight, and softer visuals that reduce fatigue during long sessions.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<GraduationCap className="h-5 w-5" />}
              title="Structured Test Flow"
              description="Listening, structure, and reading laid out with clearer pacing."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Proctored Sessions"
              description="Camera, microphone, and violation events stay visible but not distracting."
            />
            <FeatureCard
              icon={<Sparkles className="h-5 w-5" />}
              title="Modern Admin Surface"
              description="Question bank, reports, and live sessions feel like one product."
            />
          </div>

          <div className="mt-10 grid gap-5 rounded-[28px] bg-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:grid-cols-[1.2fr_0.8fr]">
            <div className="soft-card p-5">
              <div className="text-sm font-semibold text-[color:var(--ink-soft)]">Demo Access</div>
              <div className="mt-4 space-y-3 text-sm text-[color:var(--ink-main)]">
                <div className="rounded-[20px] bg-white px-4 py-3">
                  <div className="font-semibold text-[color:var(--ink-strong)]">Admin</div>
                  <div className="mt-1 font-mono text-xs">admin@demo-toefl.local / Admin123!</div>
                </div>
                <div className="rounded-[20px] bg-white px-4 py-3">
                  <div className="font-semibold text-[color:var(--ink-strong)]">Participant</div>
                  <div className="mt-1 font-mono text-xs">participant@demo-toefl.local / Participant123!</div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-gradient-to-br from-[#2457e7] to-[#1738a2] p-5 text-white shadow-[0_18px_40px_rgba(23,56,162,0.28)]">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-white/72">Session Note</div>
              <div className="mt-4 text-2xl font-extrabold leading-tight">
                More inviting UI, same exam discipline.
              </div>
              <p className="mt-4 text-sm leading-7 text-white/80">
                The goal is not decoration. The goal is a more focused test environment that still feels professional.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-card-strong relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute -top-14 right-8 h-32 w-32 rounded-full bg-[#dfe6ff] blur-3xl" />
          <div className="absolute bottom-0 left-8 h-28 w-28 rounded-full bg-[#fde7cb] blur-3xl" />

          <div className="relative">
            <span className="eyebrow">{isLogin ? 'Welcome Back' : 'Create Access'}</span>
            <h2 className="mt-5 text-4xl font-extrabold">
              {isLogin ? 'Sign in to continue your exam flow.' : 'Create a participant account.'}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
              {isLogin
                ? 'Use one of the demo accounts or your existing profile.'
                : 'Registration is local to this system and tied to the test platform database.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {!isLogin && (
                <label className="block">
                  <span className="field-label">Full Name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="field-input"
                    placeholder="Type participant full name"
                    required={!isLogin}
                  />
                </label>
              )}

              <label className="block">
                <span className="field-label">Email Address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field-input"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="block">
                <span className="field-label">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field-input"
                  placeholder="Enter your password"
                  required
                />
              </label>

              {error && (
                <div className="rounded-[22px] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="ghost-btn"
              >
                {isLogin ? 'Need a new account?' : 'Already have an account?'}
              </button>

              {isLogin && (
                <button
                  type="button"
                  onClick={() => {
                    resetLocalDemoData();
                    setError('');
                    setEmail('admin@demo-toefl.local');
                    setPassword('Admin123!');
                  }}
                  className="text-sm font-semibold text-[color:var(--blue-deep)] underline decoration-[rgba(35,88,230,0.28)] underline-offset-4"
                >
                  Reset demo data
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="soft-card p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--blue-soft)] text-[color:var(--blue-deep)]">
        {icon}
      </div>
      <div className="mt-4 text-lg font-extrabold text-[color:var(--ink-strong)]">{title}</div>
      <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">{description}</p>
    </div>
  );
}
