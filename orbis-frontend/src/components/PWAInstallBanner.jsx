import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Écoute de l'événement natif d'installation PWA
    const handleBeforeInstallPrompt = (e) => {
      // Empêche le prompt natif automatique du navigateur
      e.preventDefault();
      // Conserve l'événement pour l'utiliser lors du clic
      setDeferredPrompt(e);
      // Affiche notre bannière personnalisée
      setIsVisible(true);
      console.log('PWA: beforeinstallprompt capturé.');
    };

    // Écoute de la réussite de l'installation (si l'utilisateur installe depuis la barre d'adresse)
    const handleAppInstalled = () => {
      console.log('PWA: Application installée avec succès.');
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Vérifie si l'application tourne déjà en mode autonome (PWA déjà installée et ouverte)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Déclenche le prompt d'installation natif
    deferredPrompt.prompt();

    // Attend la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: Choix utilisateur -> ${outcome}`);
    
    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    // Masque pour la session actuelle pour ne pas harceler l'utilisateur pendant sa navigation
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50 animate-slideUp">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-teal-500/30 text-white rounded-2xl shadow-2xl p-5 relative overflow-hidden">
        {/* Halo décoratif discret */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl"></div>

        {/* Bouton de fermeture temporaire */}
        <button 
          onClick={handleDismiss}
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
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
              Orbis CRM sur Mobile
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Ajoutez l'application sur votre écran d'accueil pour profiter de l'expérience plein écran et de l'accès hors-ligne.
            </p>
          </div>
        </div>

        <div className="flex gap-2.5 mt-4 justify-end">
          <button
            onClick={handleDismiss}
            className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Plus tard
          </button>
          
          <button
            onClick={handleInstallClick}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}
