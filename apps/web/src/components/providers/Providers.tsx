'use client';
import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { SocketProvider } from './SocketProvider';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime:30_000, retry:1, refetchOnWindowFocus:false }, mutations: { throwOnError:false } } });

function AuthInit() {
  const init = useAuthStore(s => s.initialize);
  const done = useRef(false);
  useEffect(() => { if(done.current) return; done.current=true; init(); }, [init]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <AuthInit />
      <SocketProvider>{children}</SocketProvider>
    </QueryClientProvider>
  );
}
