import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './components/UI/Toast';
import ThemeToggle from './components/ThemeToggle';
import AuthPage from './pages/AuthPage';
import CommercialDashboard from './pages/CommercialDashboard';

// ID Client Google Cloud réel
const GOOGLE_CLIENT_ID = '888553843615-o50pub4r34o8tssooskbsgr18rkcfq6q.apps.googleusercontent.com';

function AppContent() {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);

  // Essayer de restaurer la session au chargement initial
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLoginSuccess = (sessionData) => {
    setUser(sessionData.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    showToast('Session terminée. À bientôt !', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 transition-colors duration-300">
      {!user ? (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <CommercialDashboard onLogout={handleLogout} />
      )}
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

