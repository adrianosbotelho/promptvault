'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect once
    if (!hasRedirected) {
      setHasRedirected(true);
      // Check if user is authenticated
      if (isAuthenticated()) {
        router.replace('/dashboard'); // Use replace instead of push
      } else {
        router.replace('/login'); // Use replace instead of push
      }
    }
  }, [router, hasRedirected]);

  return (
    <div className="min-h-full bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
