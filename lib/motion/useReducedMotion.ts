'use client';

import { useState, useEffect } from 'react';

export function useReducedMotion(): { isReduced: boolean; toggle: () => void } {
  const [isReduced, setIsReduced] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check localStorage preference
    const saved = localStorage.getItem('studyslot-reduced-motion');
    if (saved !== null) {
      const active = saved === 'true';
      setIsReduced(active);
      document.documentElement.dataset.motion = active ? 'reduced' : 'normal';
      return;
    }

    // 2. Fall back to OS media query
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReduced(media.matches);
    if (media.matches) {
      document.documentElement.dataset.motion = 'reduced';
    }

    const handler = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('studyslot-reduced-motion') === null) {
        setIsReduced(e.matches);
        document.documentElement.dataset.motion = e.matches ? 'reduced' : 'normal';
      }
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const toggle = () => {
    setIsReduced((prev) => {
      const next = !prev;
      localStorage.setItem('studyslot-reduced-motion', String(next));
      document.documentElement.dataset.motion = next ? 'reduced' : 'normal';
      return next;
    });
  };

  return { isReduced, toggle };
}
