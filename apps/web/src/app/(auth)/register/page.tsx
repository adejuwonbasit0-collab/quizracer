'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn, passwordStrength } from '@/lib/utils';

const schema = z.object({
  username:z.string().min(3,'Min 3 chars').max(20,'Max 20 chars').regex(/^[a-zA-Z0-9_]+$/,'Letters, numbers, underscores only'),
  displayName:z.string().min(2,'Min 2 chars').max(40,'Max 40 chars'),
  email:z.string().email('Invalid email'),
  password:z.string().min(8,'Min 8 chars'),
  confirm:z.string(),
}).refine(d=>d.password===d.confirm,{message:'Passwords do not match',path:['confirm']});
type F = z.infer<typeof schema>;

export default function RegisterPage() {
  const router=useRouter(); const reg=useAuthStore(s=>s.register);
  const [showPw,setShowPw]=useState(false); const [err,setErr]=useState('');
  const { register, handleSubmit, watch, formState:{errors,isSubmitting} } = useForm<F>({resolver:zodResolver(schema)});
  const pw=watch('password',''); const strength=passwordStrength(pw);
  const strengthColors=['bg-red-500','bg-orange-500','bg-yellow-500','bg-emerald-400','bg-emerald-400','bg-emerald-400'];
  const onSubmit=async(d:F)=>{
    setErr('');
    try{ await reg(d.email,d.username,d.displayName,d.password); router.replace('/dashboard'); }
    catch(e:any){ setErr(e?.response?.data?.message??e?.message??'Registration failed'); }
  };
  const inp=(hasErr:boolean)=>cn('w-full px-3 py-2.5 rounded-lg bg-input border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500',hasErr?'border-destructive':'border-border');
  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.4}}>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4"><div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,.4)]"><Zap className="w-6 h-6 text-white"/></div><span className="font-game text-2xl text-white tracking-wider">QUIZRACER</span></div>
        <h1 className="text-2xl font-bold text-white">Create your account</h1>
        <p className="text-muted-foreground mt-1 text-sm">Free forever · No credit card</p>
      </div>
      <div className="game-panel p-6 space-y-4">
        {err&&<div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"><AlertCircle className="w-4 h-4 shrink-0"/>{err}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Username</label><input {...register('username')} type="text" autoComplete="username" placeholder="speedracer" className={inp(!!errors.username)}/>{errors.username&&<p className="mt-1 text-xs text-destructive">{errors.username.message}</p>}</div>
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Display Name</label><input {...register('displayName')} type="text" autoComplete="name" placeholder="Speed Racer" className={inp(!!errors.displayName)}/>{errors.displayName&&<p className="mt-1 text-xs text-destructive">{errors.displayName.message}</p>}</div>
          </div>
          <div><label className="block text-sm font-medium text-foreground mb-1.5">Email</label><input {...register('email')} type="email" autoComplete="email" placeholder="you@example.com" className={inp(!!errors.email)}/>{errors.email&&<p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}</div>
          <div><label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <div className="relative"><input {...register('password')} type={showPw?'text':'password'} autoComplete="new-password" placeholder="Min. 8 characters" className={cn(inp(!!errors.password),'pr-10')}/>
            <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">{showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div>
            {pw&&<div className="mt-2 space-y-1"><div className="flex gap-1">{Array.from({length:5}).map((_,i)=><div key={i} className={cn('h-1 flex-1 rounded-full transition-all',i<strength.score?strengthColors[strength.score-1]:'bg-border')}/>)}</div><p className={cn('text-xs',strength.color)}>{strength.label}</p></div>}
            {errors.password&&<p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div><label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label><input {...register('confirm')} type="password" autoComplete="new-password" placeholder="Repeat password" className={inp(!!errors.confirm)}/>{errors.confirm&&<p className="mt-1 text-xs text-destructive">{errors.confirm.message}</p>}</div>
          <button type="submit" disabled={isSubmitting} className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,.3)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isSubmitting?<><Loader2 className="w-4 h-4 animate-spin"/>Creating…</>:'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">Already racing?{' '}<Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in →</Link></p>
      </div>
    </motion.div>
  );
}
