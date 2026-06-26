"use client";
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const isLoading = useAuthStore(s => s.isLoading);
  const initialize = useAuthStore(s => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {user.displayName || user.username}!</p>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <button
        onClick={() => { useAuthStore.getState().logout(); }}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Logout
      </button>
    </div>
  );
}
