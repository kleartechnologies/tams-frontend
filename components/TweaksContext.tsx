'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Tweaks {
  accentHue: number;
  density: 'compact' | 'normal' | 'comfy';
  dark: boolean;
  sidebarCollapsed: boolean;
  ctaTone: 'accent' | 'green' | 'ink';
}

const DEFAULTS: Tweaks = {
  accentHue: 250,
  density: 'normal',
  dark: false,
  sidebarCollapsed: false,
  ctaTone: 'accent',
};

interface TweaksContextValue {
  tweaks: Tweaks;
  setTweaks: React.Dispatch<React.SetStateAction<Tweaks>>;
}

const TweaksContext = createContext<TweaksContextValue>({
  tweaks: DEFAULTS,
  setTweaks: () => {},
});

export function TweaksProvider({ children }: { children: React.ReactNode }) {
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tams-tweaks-v2');
      if (saved) setTweaks({ ...DEFAULTS, ...JSON.parse(saved) });
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('tams-tweaks-v2', JSON.stringify(tweaks));
  }, [tweaks, loaded]);

  return (
    <TweaksContext.Provider value={{ tweaks, setTweaks }}>
      {children}
    </TweaksContext.Provider>
  );
}

export function useTweaks() {
  return useContext(TweaksContext);
}
