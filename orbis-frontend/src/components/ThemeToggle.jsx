import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

// Labels et icônes pour chaque état du thème tri-state
const THEME_CONFIG = {
  dark:   { icon: <Moon size={14} />,    label: 'Sombre',  color: 'text-indigo-400'  },
  light:  { icon: <Sun size={14} />,     label: 'Clair',   color: 'text-amber-400'   },
  system: { icon: <Monitor size={14} />, label: 'Système', color: 'text-emerald-400' }
};

const ThemeToggle = () => {
  const { theme, cycleTheme } = useTheme();
  const config = THEME_CONFIG[theme] || THEME_CONFIG.dark;

  return (
    <button
      id="theme-toggle-btn"
      onClick={cycleTheme}
      title={`Mode : ${config.label} — cliquer pour changer`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                 bg-slate-900 border border-slate-800
                 hover:border-slate-700 hover:bg-slate-800
                 ${config.color}
                 transition-all duration-200 text-xs font-semibold select-none`}
    >
      {config.icon}
      <span className="hidden sm:block">{config.label}</span>
    </button>
  );
};

export default ThemeToggle;
