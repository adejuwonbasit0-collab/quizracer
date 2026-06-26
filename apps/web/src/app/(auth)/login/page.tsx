'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

const schema = z.object({ identifier:z.string().min(1,'Required'), password:z.string().min(1,'Required') });
type F = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter(); const sp = useSearchParams(); const login = useAuthStore(s=>s.login);
  const [showPw, setShowPw] = useState(false); const [err, setErr] = useState('');
  const { register, handleSubmit, formState:{errors,isSubmitting} } = useForm<F>({ resolver:zodResolver(schema) });
  const onSubmit = async(d:F) => {
    setErr('');
    try { await login(d.identifier,d.password); router.replace(sp.get('returnTo')?decodeURIComponent(sp.get('returnTo')!):'/dashboard'); }
    catch(e:any) { setErr(e?.response?.data?.message??e?.message??'Invalid credentials'); }
  };
  const inp = (hasErr:boolean) => cn('w-full px-3 py-2.5 rounded-lg bg-input border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500',hasErr?'border-destructive':'border-border');
  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.4}}>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4"><div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,.4)]"><Zap className="w-6 h-6 text-white"/></div><span className="font-game text-2xl text-white tracking-wider">QUIZRACER</span></div>
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="text-muted-foreground mt-1 text-sm">Sign in to race</p>
      </div>
      <div className="game-panel p-6 space-y-5">
        {err&&<motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"><AlertCircle className="w-4 h-4 shrink-0"/>{err}</motion.div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div><label className="block text-sm font-medium text-foreground mb-1.5">Email or Username</label>
            <input {...register('identifier')} type="text" autoComplete="username" placeholder="you@example.com" className={inp(!!errors.identifier)}/>
            {errors.identifier&&<p className="mt-1 text-xs text-destructive">{errors.identifier.message}</p>}
          </div>
          <div><div className="flex items-center justify-between mb-1.5"><label className="text-sm font-medium text-foreground">Password</label><Link href="#" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Forgot password?</Link></div>
            <div className="relative"><input {...register('password')} type={showPw?'text':'password'} autoComplete="current-password" placeholder="••••••••" className={cn(inp(!!errors.password),'pr-10')}/>
            <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">{showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div>
            {errors.password&&<p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,.3)] hover:shadow-[0_0_30px_rgba(99,102,241,.5)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isSubmitting?<><Loader2 className="w-4 h-4 animate-spin"/>Signing in…</>:'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">No account?{' '}<Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Create one free →</Link></p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="flex-1 h-px bg-border"/><span>Demo: demo@quizracer.io / Demo1234!</span><div className="flex-1 h-px bg-border"/></div>
      </div>
    </motion.div>
  );
}
