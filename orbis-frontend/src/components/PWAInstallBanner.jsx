import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';

// Détection iOS robuste (iPhone, iPad, iPod et iPad OS 13+)
const isIOSDevice = () => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [showFallbackInstructions, setShowFallbackInstructions] = useState(false);

  useEffect(() => {
    // Si l'application est déjà installée et ouverte en mode PWA standalone → ne rien afficher
    if (isInStandaloneMode()) return;

    // Déterminer la plateforme et afficher la bannière correspondante sur chaque rafraîchissement
    if (isIOSDevice()) {
      setShowIOS(true);
    } else {
      setShowAndroid(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };

    const handleAppInstalled = () => {
      setShowAndroid(false);
      setShowIOS(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Si l'événement beforeinstallprompt n'a pas encore été déclenché par le navigateur, 
      // on affiche les instructions manuelles pour les navigateurs de bureau/Android.
      setShowFallbackInstructions(true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroid(false);
      setDeferredPrompt(null);
    }
  };

  // Bannière iOS
  if (showIOS) {
    return (
      <div className="fixed bottom-6 right-4 left-4 md:left-auto md:right-6 md:w-96 z-50 animate-slideUp">
        <div className="bg-slate-900/97 backdrop-blur-xl border border-teal-500/30 text-white rounded-2xl shadow-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />
          <button
            onClick={() => setShowIOS(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3 mb-3">
            <div className="flex-shrink-0 w-11 h-11 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center text-teal-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-5">
              <h3 className="font-bold text-sm text-white">Installer Orbis CRM</h3>
              <p className="text-xs text-slate-400 mt-0.5">Accès rapide depuis votre écran d'accueil</p>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 space-y-2 border border-slate-700/40">
            <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider mb-2">Instructions d'installation :</p>
            
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Appuyez sur l'icône de <strong className="text-white">Partage</strong> (icône <strong className="text-white">⬆</strong> ou menu de votre navigateur)
              </p>
            </div>
            
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Faites défiler le menu et appuyez sur <strong className="text-white">"Sur l'écran d'accueil"</strong> ou <strong className="text-white">"Ajouter à l'écran d'accueil"</strong>
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Appuyez sur <strong className="text-white">"Ajouter"</strong> en haut à droite pour finaliser
              </p>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center mt-3">
            Ce message disparaîtra définitivement une fois l'application installée.
          </p>
        </div>
      </div>
    );
  }

  // Bannière Android / Chrome / Desktop
  if (!showAndroid) return null;

  return (
    <div className="fixed bottom-6 right-4 left-4 md:left-auto md:right-6 md:w-96 z-50 animate-slideUp">
      <div className="bg-slate-900/97 backdrop-blur-xl border border-teal-500/30 text-white rounded-2xl shadow-2xl p-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />
        <button
          onClick={() => setShowAndroid(false)}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center text-teal-400">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="font-semibold text-sm text-slate-100">Orbis CRM sur Mobile</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Installez l'application pour un accès instantané et une expérience fluide plein écran.
            </p>
          </div>
        </div>

        {showFallbackInstructions && (
          <div className="mt-3 bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-xs text-slate-300 leading-relaxed animate-fadeIn">
            <p className="font-semibold text-teal-400 mb-1">Méthode manuelle :</p>
            Cliquez sur le menu de votre navigateur (les <strong className="text-white">3 points</strong> en haut à droite ou l'icône de <strong className="text-white">téléchargement</strong> dans la barre d'adresse) puis sélectionnez <strong className="text-white">"Installer l'application"</strong> ou <strong className="text-white">"Ajouter à l'écran d'accueil"</strong>.
          </div>
        )}

        <div className="flex gap-2.5 mt-4 justify-end">
          <button
            onClick={() => setShowAndroid(false)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Plus tard
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-90 text-xs font-bold text-slate-950 flex items-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5" />
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}
