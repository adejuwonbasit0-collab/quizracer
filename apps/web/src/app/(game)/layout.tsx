'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { TopNav } from '@/components/layout/TopNav';
import { Loader2 } from 'lucide-react';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter(); const pathname = usePathname();
  useEffect(() => { if(!isLoading && !isAuthenticated) router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`); }, [isAuthenticated,isLoading,router,pathname]);
  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 text-brand-500 animate-spin"/><p className="text-sm text-muted-foreground">Loading…</p></div></div>;
  if (!isAuthenticated) return null;
  return <div className="min-h-screen bg-background flex flex-col"><TopNav/><main className="flex-1 min-w-0">{children}</main></div>;
}
