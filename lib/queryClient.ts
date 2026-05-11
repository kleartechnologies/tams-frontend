import { QueryClient, QueryCache } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error: unknown) => {
        const e = error as { response?: { status?: number } };
        if (e?.response?.status === 401) {
          window.location.href = '/login';
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime:            60_000,   // 1 min — data stays fresh, won't refetch on re-mount
        gcTime:               300_000,  // 5 min garbage collection
        refetchOnWindowFocus: false,    // prevents aggressive refetch on tab switch
        retry:                1,
      },
    },
  });
}
