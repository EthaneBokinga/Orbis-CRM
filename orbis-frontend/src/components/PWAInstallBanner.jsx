import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

const isIOSDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isAndroidDevice = () => /Android/.test(navigator.userAgent);

const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone;

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFallbackInstructions, setShowFallbackInstructions] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    if (isIOSDevice()) {
      setPlatform('ios');
      return;
    }

    if (isAndroidDevice()) {
      setPlatform('android');
      return;
    }

    setPlatform('desktop');
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setPlatform('android');
    };

    const handleAppInstalled = () => {
      setPlatform(null);
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
      setShowFallbackInstructions(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setPlatform(null);
      setDeferredPrompt(null);
    }
  };

  if (!platform) return null;

  const containerClasses =
    'fixed inset-x-4 bottom-4 z-50 max-w-[min(420px,calc(100%-2rem))] mx-auto';
  const buttonClasses =
    'w-full rounded-3xl px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/20 hover:opacity-95 transition';
  const cardClasses =
    'mt-3 bg-slate-950 border border-slate-800 text-white rounded-[28px] shadow-2xl p-4 sm:p-5 overflow-hidden';
  const sectionTitleClasses = 'text-[10px] font-semibold text-teal-400 uppercase tracking-wider';
  const descriptionClasses = 'text-xs text-slate-400 leading-relaxed';
  const listTextClasses = 'text-xs text-slate-300 leading-relaxed';

  return (
    <div className={containerClasses}>
      <div className="bg-slate-950 border border-slate-800 rounded-[28px] shadow-2xl p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-3xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-[0.24em] mb-1">Orbis CRM</p>
              <h3 className="text-sm font-semibold text-white">Installer l’application</h3>
            </div>
          </div>
          <button
            type="button"
            className={buttonClasses}
            onClick={() => setShowDetails((current) => !current)}
          >
            {showDetails ? 'Cacher les détails' : 'Voir l’installation'}
          </button>
        </div>

        {showDetails && (
          <div className={cardClasses}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-3xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Installer Orbis CRM</h4>
                  <p className={descriptionClasses}>Ajoutez l’application pour un accès rapide et une meilleure expérience mobile.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlatform(null)}
                className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800/60 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 bg-slate-900 border border-slate-800 rounded-3xl p-4">
              <p className={sectionTitleClasses}>Instructions</p>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-500/15 text-teal-300 text-[10px] font-bold flex items-center justify-center">1</span>
                <p className={listTextClasses}>
                  Appuyez sur l’icône de partage dans Safari ou sur le bouton d’installation dans Chrome.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-500/15 text-teal-300 text-[10px] font-bold flex items-center justify-center">2</span>
                <p className={listTextClasses}>Sélectionnez « Ajouter à l’écran d’accueil » ou « Installer ».</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-500/15 text-teal-300 text-[10px] font-bold flex items-center justify-center">3</span>
                <p className={listTextClasses}>Confirmez l’ajout puis lancez Orbis CRM en plein écran.</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setShowFallbackInstructions(true)}
                className="w-full sm:w-auto px-4 py-3 rounded-3xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                Voir méthode manuelle
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-4 py-3 rounded-3xl bg-gradient-to-r from-teal-500 to-emerald-500 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 hover:opacity-95 transition"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Installer
              </button>
            </div>

            {showFallbackInstructions && (
              <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-300">
                <p className={sectionTitleClasses}>Méthode manuelle</p>
                <p className={listTextClasses}>
                  Ouvrez le menu du navigateur, puis choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ». Cette bannière est maintenant cachée sauf si vous réouvrez les détails.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
