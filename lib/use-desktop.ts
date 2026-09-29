'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 960px)';

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

export function useDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
