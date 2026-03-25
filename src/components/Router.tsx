import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';
import { TestStarter } from './participant/TestStarter';
import { TestResults } from './participant/TestResults';

export function Router() {
  const { loading } = useAuth();
  const path = window.location.pathname;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
