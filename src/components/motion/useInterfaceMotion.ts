'use client';

import { useSyncExternalStore } from 'react';
import { useAppSettings } from '@/contexts/AppContext';

const query = '(prefers-reduced-motion: reduce)';
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => true;

/** Both the OS and the in-product preference can reduce motion. */
export function useInterfaceMotion() {
  const systemReduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { settings, hydrated } = useAppSettings();
  return !hydrated || settings.reducedMotion || systemReduced;
}
