'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { AppShell } from '../components/app-shell';
import { SessionProvider } from '../lib/session';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 5_000 } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AppShell>{children}</AppShell>
      </SessionProvider>
    </QueryClientProvider>
  );
}
