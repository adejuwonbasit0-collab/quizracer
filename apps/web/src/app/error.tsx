'use client';
import { useEffect } from 'react';
import Link from 'next/link';
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="en" className="dark"><body className="bg-background text-foreground min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">💥</div>
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mb-6">{error.message ?? 'An unexpected error occurred.'}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all">Try Again</button>
          <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-semibold text-sm hover:bg-secondary/80 transition-all">Go Home</Link>
        </div>
      </div>
    </body></html>
  );
}
