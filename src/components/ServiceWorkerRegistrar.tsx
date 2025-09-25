'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register the service worker on client load
      navigator.serviceWorker.register('/sw.js').catch(err => {
        // eslint-disable-next-line no-console
        console.error('SW registration failed:', err);
      });
    }
  }, []);

  return null;
}
