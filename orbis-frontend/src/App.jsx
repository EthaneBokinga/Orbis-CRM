import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/UI/Toast';

import AuthPage from './pages/AuthPage';
import CommercialDashboard from './pages/CommercialDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PWAInstallBanner from './components/PWAInstallBanner';

// ID Client Google Cloud réel
const GOOGLE_CLIENT_ID = '888553843615-o50pub4r34o8tssooskbsgr18rkcfq6q.apps.googleusercontent.com';

// === GESTIONNAIRE DE SÉCURITÉ : VÉRIFICATION DU TOKEN ET DU RÔLE (VIA BACKEND) ===
const ProtectedRoute = ({ children, allowedRole }) => {
  const [checking, setChecking] = React.useState(true);
  const [roleOk, setRoleOk] = React.useState(false);

  React.useEffect(() => {
    const API_AUTH_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/auth` : 'http://localhost:5001/api/auth';

    // Call profile endpoint with credentials so httpOnly cookies are sent
    fetch(`${API_AUTH_URL}/profile`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        const serverRole = data.user?.role || localStorage.getItem('userRole');
        localStorage.setItem('userRole', serverRole);
        if (allowedRole && serverRole !== allowedRole) {
          setRoleOk(false);
        } else {
          setRoleOk(true);
        }
      })
      .catch(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        setRoleOk(false);
      })
      .finally(() => setChecking(false));
  }, [allowedRole]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl border-2 border-t-emerald-400 border-slate-800 animate-spin"></div>
      </div>
    );
  }

  if (!roleOk) {
    const userRole = localStorage.getItem('userRole');
    return <Navigate to={userRole === 'admin' ? '/admin' : '/'} replace />;
  }

  return children;
};

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  // Simulation du Splash Screen Premium (Initialisation d'Orbis CRM)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // Reste visible 2 secondes
    return () => clearTimeout(timer);
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <ToastProvider>
          {showSplash ? (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden select-none">
              {/* Halos lumineux en arrière-plan */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[80px] animate-pulse-slow"></div>
              
              {/* Logo animé */}
              <div className="relative flex flex-col items-center space-y-4 z-10">
                <img src="/outpout/icons/icon-transparent-512x512.png" alt="Orbis CRM Logo" className="w-20 h-20 object-contain drop-shadow-2xl animate-bounce" />
                <div className="text-center">
                  <h1 className="text-xl font-bold tracking-widest text-white font-sans animate-pulse">ORBIS CRM</h1>
                  <p className="text-[10px] font-mono text-slate-500 tracking-wider uppercase mt-1">Force de vente & Gestion</p>
                </div>
                
                {/* Barre de chargement fine */}
                <div className="w-32 h-[2px] bg-slate-900 rounded-full overflow-hidden mt-4 relative">
                  <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full w-full absolute left-0 top-0 origin-left animate-[polyline_1.5s_infinite_ease-in-out]"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <BrowserRouter>
                <Routes>
                  {/* ROUTE PUBLIQUE : Authentification (Formulaire + Google) */}
                  <Route path="/" element={<AuthPage />} />

                  {/* ROUTE PROTÉGÉE : Espace Commercial */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <CommercialDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* ROUTE PROTÉGÉE CRITIQUE : Espace Super-Admin (rôle 'admin' uniquement) */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRole="admin">
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* REDIRECTION AUTOMATIQUE : Toute URL inconnue → Login */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <PWAInstallBanner />
              </BrowserRouter>
            </>
          )}
        </ToastProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
