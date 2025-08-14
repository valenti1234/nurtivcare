'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processSyncQueue } from '@/lib/offline/db';

export function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (pendingCount > 0) {
        setIsSyncing(true);
        try {
          await processSyncQueue();
          setPendingCount(0);
        } catch (error) {
          console.error('Sync failed:', error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingCount]);

  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
      isOnline 
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    )}>
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isOnline ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      
      <span>
        {isSyncing ? 'Syncing...' : isOnline ? 'Online' : `Offline${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`}
      </span>
    </div>
  );
}