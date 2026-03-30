import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Router } from './components/Router';

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <Router />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
