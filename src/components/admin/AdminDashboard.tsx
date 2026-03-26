import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, FileText, LogOut, Package, ShieldCheck, Users } from 'lucide-react';
import { PackageManager } from './PackageManager';
import { QuestionBank } from './QuestionBank';
import { SessionMonitor } from './SessionMonitor';
import { ReportsView } from './ReportsView';

type Tab = 'packages' | 'questions' | 'sessions' | 'reports';

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('packages');

  const tabs = [
    { id: 'packages' as Tab, label: 'Test Packages', icon: Package, blurb: 'Control active exam packages and section flow.' },
    { id: 'questions' as Tab, label: 'Question Bank', icon: FileText, blurb: 'Write, revise, and structure question content.' },
    { id: 'sessions' as Tab, label: 'Live Sessions', icon: Users, blurb: 'Switch between live rooms, completed history, and violation-led review.' },
    { id: 'reports' as Tab, label: 'Reports', icon: BarChart3, blurb: 'Review scores and export result data.' },
  ];

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab)!;

  return (
    <div className="min-h-screen bg-[#f3f6ff] py-4 sm:py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-3 sm:px-6 lg:px-8 sm:space-y-6">
        <header className="admin-surface overflow-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:gap-6">
            <div>
              <span className="eyebrow">Admin Control Room</span>
              <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">TOEFL Command Center</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--ink-soft)] md:text-base md:leading-8">
                Welcome, {profile?.full_name}. This surface is being reshaped to feel closer to a modern control desk: softer layers, stronger hierarchy, and clearer separation between operations and monitoring.
              </p>
            </div>

            <div className="admin-soft-surface p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">Current Focus</div>
                  <div className="mt-2 text-xl font-extrabold sm:text-2xl">{activeTabMeta.label}</div>
                  <div className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">{activeTabMeta.blurb}</div>
                </div>
                <button onClick={() => signOut()} className="secondary-btn w-full sm:w-auto">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>

              <div className="mt-5 rounded-[20px] bg-[linear-gradient(135deg,#eff4ff,#f6f1ff)] p-4 sm:mt-6 sm:rounded-[24px]">
                <div className="flex items-start gap-3 text-sm font-semibold text-[color:var(--ink-strong)] sm:items-center">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500 sm:mt-0" />
                  Local backend, database, and monitoring stack connected
                </div>
              </div>
            </div>
          </div>
        </header>

        <nav className="admin-surface p-2 sm:p-3">
          <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-[22px] px-4 py-4 text-left transition-all ${
                    active ? 'bg-[linear-gradient(135deg,#2358e6,#3478ff)] text-white shadow-[0_18px_30px_rgba(35,88,230,0.22)]' : 'bg-[#f7f8ff] text-[color:var(--ink-main)] hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${active ? 'bg-white/20 text-white' : 'bg-[color:var(--blue-soft)] text-[color:var(--blue-deep)]'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold">{tab.label}</div>
                      <div className={`mt-1 text-xs leading-5 ${active ? 'text-white/78' : 'text-[color:var(--ink-soft)]'}`}>{tab.blurb}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        <main className="admin-surface p-3 sm:p-4 lg:p-6">
          {activeTab === 'packages' && <PackageManager />}
          {activeTab === 'questions' && <QuestionBank />}
          {activeTab === 'sessions' && <SessionMonitor />}
          {activeTab === 'reports' && <ReportsView />}
        </main>
      </div>
    </div>
  );
}
