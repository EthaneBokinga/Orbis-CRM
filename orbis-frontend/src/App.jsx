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

// === GESTIONNAIRE DE SÉCURITÉ : VÉRIFICATION DU TOKEN ET DU RÔLE ===
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  // 1. Si aucun token → retour immédiat au Login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 2. Si un rôle spécifique est requis et que l'utilisateur ne l'a pas
  if (allowedRole && userRole !== allowedRole) {
    // Redirection automatique selon ses privilèges réels
    return <Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} replace />;
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
              </BrowserRouter>
              <PWAInstallBanner />
            </>
          )}
        </ToastProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
