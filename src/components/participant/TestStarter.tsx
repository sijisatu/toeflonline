import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, TestPackage, TestSection } from '../../lib/supabase';
import { TestInterface } from './TestInterface';
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, Clock3, Mic, ShieldCheck } from 'lucide-react';

type TestStarterProps = {
  packageId: string;
};

export function TestStarter({ packageId }: TestStarterProps) {
  const { profile } = useAuth();
  const [testPackage, setTestPackage] = useState<TestPackage | null>(null);
  const [sections, setSections] = useState<TestSection[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [micPermission, setMicPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPackageInfo();
    void checkExistingSession();
  }, [packageId]);

  const fetchPackageInfo = async () => {
    try {
      const { data: packageData, error: packageError } = await supabase
        .from('test_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError) throw packageError;
      setTestPackage(packageData);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('test_sections')
        .select('*')
        .eq('package_id', packageId)
        .order('section_order');

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
    } catch (error) {
      console.error('Error fetching package info:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingSession = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('test_sessions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('package_id', packageId)
        .eq('status', 'in_progress')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSessionId(data.id);
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setCameraPermission(true);
      setMicPermission(true);

      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error('Error requesting permissions:', error);
      alert('Camera and microphone access is required to take the test.');
    }
  };

  const startTest = async () => {
    if (!profile || !testPackage) return;

    try {
      const { data, error } = await supabase
        .from('test_sessions')
        .insert([
          {
            user_id: profile.id,
            package_id: packageId,
            status: 'in_progress',
            time_remaining_seconds: testPackage.duration_minutes * 60,
            current_section_id: sections[0]?.id,
            current_question_number: 1,
            proctoring_enabled: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
    } catch (error) {
      console.error('Error starting test:', error);
      alert('Failed to start test. Please try again.');
    }
  };

  if (sessionId) {
    return <TestInterface packageId={packageId} sessionId={sessionId} />;
  }

  if (loading) {
    return (
      <div className="page-backdrop flex items-center justify-center px-4">
        <div className="glass-card-strong w-full max-w-md p-10 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#d7e1ff] border-t-[color:var(--blue)]" />
          <p className="mt-6 text-sm text-[color:var(--ink-soft)]">Loading package briefing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-backdrop py-6">
      <div className="shell-wrap space-y-6">
        <div className="flex justify-start">
          <button onClick={() => (window.location.href = '/')} className="secondary-btn">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="glass-card p-6 sm:p-8">
            <span className="eyebrow">Session Briefing</span>
            <h1 className="mt-4 text-4xl font-extrabold">{testPackage?.title}</h1>
            {testPackage?.description && (
              <p className="mt-4 max-w-3xl text-sm leading-8 text-[color:var(--ink-soft)] md:text-base">
                {testPackage.description}
              </p>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="metric-card">
                <div className="metric-label">Duration</div>
                <div className="mt-3 flex items-center gap-2 text-2xl font-extrabold text-[color:var(--ink-strong)]">
                  <Clock3 className="h-5 w-5 text-[color:var(--blue)]" />
                  {testPackage?.duration_minutes}m
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Sections</div>
                <div className="metric-value">{sections.length}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Proctoring</div>
                <div className="mt-3 flex items-center gap-2 text-lg font-extrabold text-[color:var(--ink-strong)]">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  Required
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="soft-card p-5">
                <div className="text-sm font-bold uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">Section Order</div>
                <div className="mt-4 space-y-3">
                  {sections.map((section, index) => (
                    <div key={section.id} className="flex items-center justify-between rounded-[20px] bg-white px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--ink-strong)]">
                          {index + 1}. {section.title}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--ink-soft)]">{section.total_questions} questions</div>
                      </div>
                      <div className="rounded-full bg-[color:var(--blue-soft)] px-3 py-1 text-xs font-bold text-[color:var(--blue-deep)]">
                        {section.duration_minutes} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-gradient-to-br from-[#f8edcf] to-[#fff7e6] p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-[#a96700]" />
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[0.24em] text-[#996100]">Important</div>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--ink-main)]">
                      <li>Camera and microphone must stay enabled during the whole attempt.</li>
                      <li>Do not switch tabs or minimize the browser.</li>
                      <li>You cannot pause the test after it starts.</li>
                      <li>Snapshots and violation events may be recorded for review.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card-strong p-6 sm:p-8">
            <span className="eyebrow">System Check</span>
            <h2 className="mt-4 text-3xl font-extrabold">Verify your device access.</h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
              Before entering the test, confirm that camera and microphone permissions are available.
            </p>

            <div className="mt-8 space-y-4">
              <PermissionCard
                active={cameraPermission}
                icon={<Camera className="h-5 w-5" />}
                title="Camera Access"
                description="Used for presence monitoring and periodic capture during the session."
              />
              <PermissionCard
                active={micPermission}
                icon={<Mic className="h-5 w-5" />}
                title="Microphone Access"
                description="Used to confirm the session environment remains compliant."
              />
            </div>

            <div className="mt-8 space-y-3">
              {!cameraPermission || !micPermission ? (
                <button onClick={requestPermissions} className="primary-btn w-full">
                  Grant Permissions
                </button>
              ) : (
                <button onClick={startTest} className="primary-btn w-full">
                  Start Test
                </button>
              )}
              <button onClick={() => (window.location.href = '/')} className="secondary-btn w-full">
                Return to Dashboard
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PermissionCard({
  active,
  icon,
  title,
  description,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={`rounded-[26px] p-5 ${active ? 'bg-[#effff6]' : 'bg-[#f8f8ff]'}`}>
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            active ? 'bg-[#d5ffe9] text-[#13884f]' : 'bg-white text-[color:var(--blue-deep)]'
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-extrabold">{title}</h3>
            {active && <CheckCircle2 className="h-5 w-5 text-[#18a561]" />}
          </div>
          <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">{description}</p>
        </div>
      </div>
    </div>
  );
}
