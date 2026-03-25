import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, TestPackage } from '../../lib/supabase';
import { LogOut, BookOpen, Award } from 'lucide-react';

export function ParticipantDashboard() {
  const { profile, signOut } = useAuth();
  const [packages, setPackages] = useState<TestPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('test_packages')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TOEFL Online Test</h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Available Tests</h2>
          <p className="text-gray-600">Choose a test package to begin your TOEFL assessment</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tests...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
                  <BookOpen className="w-12 h-12 text-white mb-3" />
                  <h3 className="text-xl font-bold text-white mb-2">{pkg.title}</h3>
                </div>
                <div className="p-6">
                  {pkg.description && (
                    <p className="text-gray-600 mb-4 line-clamp-3">{pkg.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Award className="w-4 h-4" />
                    <span>Duration: {pkg.duration_minutes} minutes</span>
                  </div>
                  <button
                    onClick={() => startTest(pkg.id)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Start Test
                  </button>
                </div>
              </div>
            ))}

            {packages.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tests available at the moment</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
