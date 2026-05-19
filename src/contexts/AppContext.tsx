'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ── 类型 ────────────────────────────────────────────────────────────

export interface AppSettings {
  calmMode: boolean;
  difficulty: 1 | 2 | 3;
  watchBeforeDo: boolean;
  childName: string;
  /** 本次 session 的情绪前测 */
  emotionBefore: string;
  /** 本次 session 的能量/时长选择 */
  energy: 'low' | 'medium' | 'high';
}

interface AppContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  calmMode: false,
  difficulty: 2,
  watchBeforeDo: true,
  childName: '',
  emotionBefore: '',
  energy: 'medium',
};

const STORAGE_KEY = 'star-bindpaint-settings';

// ── Context ─────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // 从 localStorage 恢复持久设置
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // 持久化到 localStorage（只存持久字段）
  useEffect(() => {
    if (!hydrated) return;
    const persistent = {
      calmMode: settings.calmMode,
      difficulty: settings.difficulty,
      watchBeforeDo: settings.watchBeforeDo,
      childName: settings.childName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistent));
  }, [settings.calmMode, settings.difficulty, settings.watchBeforeDo, settings.childName, hydrated]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  // SSR 防抖：未 hydrate 前用默认值渲染
  if (!hydrated) {
    return <>{children}</>;
  }

  return (
    <AppContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppContext);
}
