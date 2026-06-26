import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-7xl font-black text-brand-600/20 font-game mb-2">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-muted-foreground text-sm mb-6">The page you're looking for doesn't exist.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all">Dashboard</Link>
          <Link href="/lobby" className="px-5 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-semibold text-sm hover:bg-secondary/80 transition-all">Play</Link>
        </div>
      </div>
    </div>
  );
}
