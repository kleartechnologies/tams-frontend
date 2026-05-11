'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk, fetchSettings } from '@/lib/queries';

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
  refresh: () => void;
}

const BrandingContext = createContext<BrandingCtx>({
  branding: DEFAULTS,
  refresh:  () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: qk.settings(),
    queryFn:  fetchSettings,
    staleTime: 5 * 60_000,
    // Seed the cache from localStorage so the sidebar has data before the first network response
    initialData: () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
  });

  const branding: Branding = {
    agencyName: data?.agencyName || DEFAULTS.agencyName,
    agencyTag:  data?.agencyTag  || DEFAULTS.agencyTag,
    logoUrl:    data?.logoUrl    ?? null,
  };

  // Persist to localStorage so the next cold load seeds the cache instantly
  useEffect(() => {
    if (data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
    }
  }, [data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.settings() });

  return (
    <BrandingContext.Provider value={{ branding, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
