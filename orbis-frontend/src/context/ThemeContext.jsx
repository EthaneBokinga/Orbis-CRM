import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Tri-State: 'light' | 'dark' | 'system' — Directive §4
  const [theme, setTheme] = useState(localStorage.getItem('orbis-theme') || 'dark');

  const applyTheme = (mode) => {
    const root = window.document.documentElement;
    console.log('[Theme] Applying theme:', mode);
    if (mode === 'dark') {
      root.classList.add('dark');
      console.log('[Theme] Added .dark to html classList:', root.classList.toString());
    } else if (mode === 'light') {
      root.classList.remove('dark');
      console.log('[Theme] Removed .dark from html classList:', root.classList.toString());
    } else {
      // Mode 'system' — synchronisation avec l'OS
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('[Theme] System prefers dark:', prefersDark);
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      console.log('[Theme] System theme classList:', root.classList.toString());
    }
  };

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('orbis-theme', theme);

    // Écoute les changements système si mode 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  // Cycle tri-state : dark → light → system → dark
  const cycleTheme = () => {
    console.log('[Theme] Cycling theme from:', theme);
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark';
      console.log('[Theme] Next theme will be:', next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
