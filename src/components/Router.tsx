import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';
import { TestStarter } from './participant/TestStarter';
import { TestResults } from './participant/TestResults';

export function Router() {
  const { loading } = useAuth();
  const path = window.location.pathname;

  if (loading) {
    return (
      <div className="page-backdrop flex items-center justify-center px-4">
        <div className="glass-card-strong w-full max-w-md p-10 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#d7e1ff] border-t-[color:var(--blue)]" />
          <h2 className="mt-6 text-2xl font-extrabold">Preparing your workspace</h2>
          <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
            Loading account, role, and active testing context.
          </p>
        </div>
      </div>
    );
  }

  if (path.startsWith('/test/')) {
    const packageId = path.split('/test/')[1];
    return <TestStarter packageId={packageId} />;
  }

  if (path === '/results') {
    return <TestResults />;
  }

  return <Dashboard />;
}
