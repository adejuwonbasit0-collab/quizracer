'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if(!isLoading && isAuthenticated) router.replace('/dashboard'); }, [isAuthenticated,isLoading,router]);
  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand-600/6 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-cyan-600/4 blur-[80px]" />
      </div>
      <main className="flex-1 flex items-center justify-center px-4 py-10 relative z-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
