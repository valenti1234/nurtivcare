'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    // For demo, redirect to the mock organization
    router.push('/org/nurtiv-demo-care/patients');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-lg">Redirecting...</div>
    </div>
  );
}