import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

// ══════════════════════════════════════════
// Configuration des 4 états de couleur
// Directive §3 : warning, error, success, info
// ══════════════════════════════════════════
const TOAST_STYLES = {
  success: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
    border: 'border-emerald-500/40',
    bar: 'bg-emerald-500',
    icon: <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />,
    title: 'text-emerald-600 dark:text-emerald-400'
  },
  error: {
    bg: 'bg-red-500/10 dark:bg-red-500/10',
    border: 'border-red-500/40',
    bar: 'bg-red-500',
    icon: <XCircle size={18} className="text-red-500 flex-shrink-0" />,
    title: 'text-red-600 dark:text-red-400'
  },
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/10',
    border: 'border-amber-500/40',
    bar: 'bg-amber-500',
    icon: <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />,
    title: 'text-amber-600 dark:text-amber-400'
  },
  info: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/10',
    border: 'border-blue-500/40',
    bar: 'bg-blue-500',
    icon: <Info size={18} className="text-blue-500 flex-shrink-0" />,
    title: 'text-blue-600 dark:text-blue-400'
  }
};

// ══════════════════════════════════════════
// Composant Toast individuel
// ══════════════════════════════════════════
const ToastItem = ({ id, type, message, onClose }) => {
  const s = TOAST_STYLES[type] || TOAST_STYLES.info;

  return (
    <div
      className={`
        relative overflow-hidden flex items-start gap-3 px-4 pt-3.5 pb-4 rounded-2xl
        border backdrop-blur-md shadow-xl animate-slideDown
        bg-white/90 dark:bg-midnight-card/90
        ${s.border}
        min-w-[300px] max-w-[380px]
      `}
    >
      {s.icon}
      <p className={`text-sm font-semibold flex-1 leading-snug ${s.title}`}>{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mt-0.5"
      >
        <X size={14} />
      </button>

      {/* Barre de progression — Directive §3 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/30 dark:bg-white/10">
        <div className={`h-full ${s.bar} toast-progress`} />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════
// Provider global Toast
// ══════════════════════════════════════════
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const closeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Conteneur fixe en haut de page */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 items-center">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onClose={closeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
