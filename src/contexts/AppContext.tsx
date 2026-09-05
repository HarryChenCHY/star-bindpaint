'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface AppSettings {
  reducedMotion: boolean;
  defaultGuidance: 'full' | 'balanced' | 'light';
  confirmBeforeAi: boolean;
}

interface AppContextValue {
  settings: AppSettings;
  hydrated: boolean;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  reducedMotion: false,
  defaultGuidance: 'full',
  confirmBeforeAi: true,
};

const STORAGE_KEY = 'startrace-interface-settings-v1';

const AppContext = createContext<AppContextValue>({
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  updateSettings: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings(previous => ({ ...previous, ...JSON.parse(stored) }));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  }, [hydrated, settings]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings(previous => ({ ...previous, ...partial }));
  };

  return (
    <AppContext.Provider value={{ settings, hydrated, updateSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppContext);
}
