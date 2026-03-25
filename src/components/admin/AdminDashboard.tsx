import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Package, FileText, Users, BarChart } from 'lucide-react';
import { PackageManager } from './PackageManager';
import { QuestionBank } from './QuestionBank';
import { SessionMonitor } from './SessionMonitor';
import { ReportsView } from './ReportsView';

type Tab = 'packages' | 'questions' | 'sessions' | 'reports';

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('packages');

  const tabs = [
    { id: 'packages' as Tab, label: 'Test Packages', icon: Package },
    { id: 'questions' as Tab, label: 'Question Bank', icon: FileText },
    { id: 'sessions' as Tab, label: 'Live Sessions', icon: Users },
    { id: 'reports' as Tab, label: 'Reports', icon: BarChart },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TOEFL Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {profile?.full_name}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'packages' && <PackageManager />}
        {activeTab === 'questions' && <QuestionBank />}
        {activeTab === 'sessions' && <SessionMonitor />}
        {activeTab === 'reports' && <ReportsView />}
      </main>
    </div>
  );
}
