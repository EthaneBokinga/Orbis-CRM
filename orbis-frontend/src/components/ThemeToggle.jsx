import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

// Labels et icônes pour chaque état du thème tri-state
const THEME_CONFIG = {
  dark:   { icon: <Moon size={16} className="text-indigo-400" />,  label: 'Sombre',  next: 'Clair'   },
  light:  { icon: <Sun size={16} className="text-amber-500" />,    label: 'Clair',   next: 'Système'  },
  system: { icon: <Monitor size={16} className="text-emerald-400" />, label: 'Système', next: 'Sombre' }
};

const ThemeToggle = () => {
  const { theme, cycleTheme } = useTheme();
  const config = THEME_CONFIG[theme] || THEME_CONFIG.dark;

  return (
    <button
      id="theme-toggle-btn"
      onClick={cycleTheme}
      title={`Mode actuel : ${config.label} — Cliquer pour passer en mode ${config.next}`}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl
                 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-sm
                 border border-gray-200 dark:border-midnight-border
                 shadow-md hover:shadow-lg
                 text-gray-700 dark:text-gray-300
                 transition-all duration-200 hover:scale-105 active:scale-95"
    >
      {config.icon}
      <span className="text-[11px] font-semibold hidden sm:block">{config.label}</span>
    </button>
  );
};

export default ThemeToggle;
