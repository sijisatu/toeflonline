import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, TestPackage, TestSection } from '../../lib/supabase';
import { TestInterface } from './TestInterface';
import { Camera, Mic, AlertCircle, CheckCircle } from 'lucide-react';

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
    fetchPackageInfo();
    checkExistingSession();
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{testPackage?.title}</h1>
        {testPackage?.description && (
          <p className="text-gray-600 mb-6">{testPackage.description}</p>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">Test Information</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>Duration: {testPackage?.duration_minutes} minutes</p>
            <p>Total Sections: {sections.length}</p>
            <p>
              Sections:{' '}
              {sections.map((s) => s.title).join(', ')}
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-gray-700">
              <p className="font-semibold text-yellow-900">Important Instructions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Camera and microphone monitoring is required throughout the test</li>
                <li>Do not switch tabs or minimize the browser window</li>
                <li>Ensure you have a stable internet connection</li>
                <li>You cannot pause the test once started</li>
                <li>Your screen activity will be monitored</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <h3 className="font-semibold text-gray-900">System Requirements</h3>

          <div
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              cameraPermission
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <Camera className={`w-5 h-5 ${cameraPermission ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="flex-1 text-sm text-gray-700">Camera Access</span>
            {cameraPermission && <CheckCircle className="w-5 h-5 text-green-600" />}
          </div>

          <div
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              micPermission
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <Mic className={`w-5 h-5 ${micPermission ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="flex-1 text-sm text-gray-700">Microphone Access</span>
            {micPermission && <CheckCircle className="w-5 h-5 text-green-600" />}
          </div>
        </div>

        <div className="space-y-3">
          {!cameraPermission || !micPermission ? (
            <button
              onClick={requestPermissions}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Grant Permissions
            </button>
          ) : (
            <button
              onClick={startTest}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Start Test
            </button>
          )}

          <button
            onClick={() => (window.location.href = '/')}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
