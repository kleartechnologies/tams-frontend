'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

export interface Branding {
  agencyName: string;
  agencyTag: string;
  logoUrl: string | null;
}

const DEFAULTS: Branding = {
  agencyName: 'TAMS',
  agencyTag:  'Travel Agency MS',
  logoUrl:    null,
};

const CACHE_KEY = 'tams-branding';

interface BrandingCtx {
  branding: Branding;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingCtx>({
  branding: DEFAULTS,
  refresh:  async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  // Always start with DEFAULTS so SSR and initial client render match.
  // localStorage and API values are applied after hydration in useEffect.
  const [branding, setBranding] = useState<Branding>(DEFAULTS);

  async function refresh() {
    try {
      const res = await api.get<Branding>('/settings');
      const data: Branding = {
        agencyName: res.data.agencyName || DEFAULTS.agencyName,
        agencyTag:  res.data.agencyTag  || DEFAULTS.agencyTag,
        logoUrl:    res.data.logoUrl    ?? null,
      };
      setBranding(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // fall back to localStorage cache if API fails
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) setBranding({ ...DEFAULTS, ...JSON.parse(cached) });
      } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    // Apply localStorage cache immediately (sync) to minimise flash,
    // then overwrite with the live API value.
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setBranding({ ...DEFAULTS, ...JSON.parse(cached) });
    } catch { /* ignore */ }
    refresh();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
