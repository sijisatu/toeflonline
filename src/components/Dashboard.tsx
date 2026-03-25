import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from './admin/AdminDashboard';
import { ParticipantDashboard } from './participant/ParticipantDashboard';

export function Dashboard() {
  const { profile } = useAuth();

  if (!profile) return null;

  return profile.role === 'admin' ? <AdminDashboard /> : <ParticipantDashboard />;
}
