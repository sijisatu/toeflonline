import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Certificate } from '../../lib/supabase';
import { Award, CheckCircle, Home } from 'lucide-react';

export function TestResults() {
  const { profile } = useAuth();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestCertificate();
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No test results found.</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Completed!</h1>
          <p className="text-gray-600">Here are your results</p>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Award className="w-8 h-8" />
            <h2 className="text-2xl font-bold">TOEFL ITP Score</h2>
          </div>
          <div className="text-center">
            <div className="text-6xl font-bold mb-2">{certificate.total_score}</div>
            <div className="text-blue-100">Total Score</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {certificate.listening_score}
            </div>
            <div className="text-sm text-gray-600">Listening</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {certificate.structure_score}
            </div>
            <div className="text-sm text-gray-600">Structure</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {certificate.reading_score}
            </div>
            <div className="text-sm text-gray-600">Reading</div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 text-center">
            This is a practice test certificate. Scores are for reference only and not for official use.
          </p>
        </div>

        <button
          onClick={() => (window.location.href = '/')}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Home className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
