'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, LayoutDashboard, Trophy, Users, LogOut, Crown, Bell, Shield, User, Menu, X, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { cn, getInitials } from '@/lib/utils';

const NAV = [
  { href:'/dashboard',   label:'Dashboard', icon:LayoutDashboard },
  { href:'/lobby',       label:'Play',       icon:Zap },
  { href:'/leaderboard', label:'Rankings',   icon:Trophy },
];
const MOBILE_NAV = [
  { href:'/dashboard',   label:'Home',    icon:LayoutDashboard },
  { href:'/lobby',       label:'Play',    icon:Zap },
  { href:'/leaderboard', label:'Ranks',   icon:Trophy },
  { href:'/profile',     label:'Profile', icon:User },
];

export function TopNav() {
  const pathname = usePathname(); const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const isAdmin = ['ADMIN','SUPERADMIN','MODERATOR'].includes((user as any)?.role ?? '');
  const profileHref = user?.username ? `/profile/${user.username}` : '/profile';

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,.4)]"><Zap className="w-4 h-4 text-white"/></div>
            <span className="font-game text-lg text-white tracking-wider hidden sm:block">QUIZRACER</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ href, label, icon:Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link key={href} href={href} className={cn('relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', active?'text-white':'text-muted-foreground hover:text-foreground hover:bg-secondary')}>
                  {active && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-brand-600/20 border border-brand-500/30" transition={{type:'spring',bounce:.2,duration:.4}}/>}
                  <Icon className="w-4 h-4 relative z-10"/><span className="relative z-10">{label}</span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link href="/admin" className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', pathname.startsWith('/admin')?'text-red-400 bg-red-500/10 border border-red-500/20':'text-muted-foreground hover:text-red-400 hover:bg-red-500/10')}>
                <Shield className="w-4 h-4"/><span>Admin</span>
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {user && <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm"><Crown className="w-3.5 h-3.5 text-yellow-400"/><span className="font-semibold text-yellow-400">{(user.coins ?? 0).toLocaleString()}</span></div>}
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative"><Bell className="w-4 h-4"/></button>
            {user && (
              <div className="flex items-center gap-2">
                <Link href={profileHref} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                  <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/50 flex items-center justify-center text-xs font-bold text-brand-300 overflow-hidden">
                    {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover"/> : getInitials(user.displayName ?? 'U')}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-foreground max-w-[100px] truncate">{user.displayName}</span>
                </Link>
                <button onClick={handleLogout} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Log out"><LogOut className="w-4 h-4"/></button>
              </div>
            )}
            <button className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary" onClick={()=>setOpen(v=>!v)}>
              {open ? <X className="w-4 h-4"/> : <Menu className="w-4 h-4"/>}
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 flex flex-col gap-1">
            {NAV.map(({href,label,icon:Icon})=>{
              const active=pathname===href||(href!=='/dashboard'&&pathname.startsWith(href));
              return <Link key={href} href={href} onClick={()=>setOpen(false)} className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium',active?'text-white bg-brand-600/20 border border-brand-500/30':'text-muted-foreground hover:text-foreground hover:bg-secondary')}><Icon className="w-4 h-4"/>{label}</Link>;
            })}
            {isAdmin && <Link href="/admin" onClick={()=>setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400"><Shield className="w-4 h-4"/>Admin Panel</Link>}
            <div className="border-t border-border mt-1 pt-2">
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"><LogOut className="w-4 h-4"/>Log out</button>
            </div>
          </div>
        )}
      </header>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-md">
        <div className="flex">
          {MOBILE_NAV.map(({href,label,icon:Icon})=>{
            const rh = href==='/profile' ? profileHref : href;
            const active=pathname===rh||(href!=='/dashboard'&&href!=='/profile'&&pathname.startsWith(href));
            return <Link key={href} href={rh} className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',active?'text-brand-400':'text-muted-foreground')}><Icon className="w-5 h-5"/>{label}</Link>;
          })}
        </div>
        <div style={{height:'env(safe-area-inset-bottom,0px)'}}/>
      </nav>
      <div className="md:hidden h-16" aria-hidden="true"/>
    </>
  );
}
