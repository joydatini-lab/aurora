/**
 * app.tsx — WEB app entry: React Query over the local data bridge + router.
 *
 * Same DI seam as the old shell: `dataProvider` is injected (built at boot by
 * `main.tsx` with the real PowerSync-backed repositories). No vendor import
 * here (AD-1).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { useState } from 'react';
import { webRouter } from './router';
import type { MobileDataProvider } from '@app/query/query-client';
import { createMobileQueryClient } from '@app/query/query-client';

export interface AuroraWebAppProps {
  dataProvider: MobileDataProvider;
}

export function AuroraWebApp({ dataProvider }: AuroraWebAppProps) {
  // Le QueryClient est créé UNE fois par montage (03 S5.8) : la cache doit
  // survivre aux re-renders.
  const [client] = useState<QueryClient>(() => createMobileQueryClient(dataProvider));

  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={webRouter} />
    </QueryClientProvider>
  );
}
