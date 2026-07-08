import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Tri-State: 'light' | 'dark' | 'system' — Directive §4
  const [theme, setTheme] = useState(localStorage.getItem('orbis-theme') || 'dark');

  const applyTheme = (mode) => {
    const root = window.document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.remove('dark');
    } else {
      // Mode 'system' — synchronisation avec l'OS
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
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
    setTheme(prev => {
      if (prev === 'dark')   return 'light';
      if (prev === 'light')  return 'system';
      return 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
