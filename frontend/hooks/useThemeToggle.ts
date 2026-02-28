'use client';

import { useState, useEffect, useCallback } from 'react';

export function useThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('pv-theme');
    const initial = stored === 'light' ? 'light' : 'dark';
    setTheme(initial);
    document.documentElement.classList.toggle('light', initial === 'light');
  }, []);

  const toggle = useCallback(() => {
    const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    document.documentElement.classList.toggle('light', next === 'light');
    localStorage.setItem('pv-theme', next);
    setTheme(next);
  }, []);

  return { theme, toggle };
}
