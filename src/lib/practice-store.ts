export type PracticeMode = 'follow' | 'auto' | 'free';

export interface PracticeCompletion {
  sessionId: string;
  galleryItemId: string;
  completedAt: string;
  dateKey: string;
  mode: PracticeMode;
  userStrokes: number;
  totalStrokes: number;
  durationMs: number;
  guidanceLevel: 'full' | 'balanced' | 'light';
}

export interface PracticeStart {
  sessionId: string;
  startedAt: string;
  dateKey: string;
  mode: PracticeMode;
}

export interface PracticeProfile {
  version: 2;
  completions: PracticeCompletion[];
  starts: PracticeStart[];
}

export interface DailyWish {
  dateKey: string;
  title: string;
  description: string;
  reward: string;
}

export interface PracticeOverview {
  todayWish: DailyWish;
  todayCompleted: boolean;
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
  totalPracticeStarts: number;
  activeDaysLast7: number;
  totalUserStrokes: number;
  totalMinutes: number;
  activeDates: string[];
  recentDays: Array<{ dateKey: string; label: string; active: boolean; isToday: boolean }>;
}

const STORAGE_KEY = 'startrace-practice-profile-v1';

const WISHES = [
  { title: '点亮今天的第一颗星', description: '完成一次绘画，让今天在星图里留下一个发光坐标。' },
  { title: '从一颗星点开始', description: '不用追求完美，只要找到起点并完成今天的一幅画。' },
  { title: '沿一段新星迹前进', description: '选择一张想画的图，让月亮伙伴陪你走完一次练习。' },
  { title: '为星图增加一个新世界', description: '今天再完成一幅作品，观察自己比上次更容易动笔了吗？' },
  { title: '把“想画”变成“开始画”', description: '进入画板并完成一次创作，第一笔就是今天的目标。' },
];

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function getDailyWish(date = new Date()): DailyWish {
  const dateKey = getLocalDateKey(date);
  const numericKey = Number(dateKey.replaceAll('-', ''));
  const wish = WISHES[numericKey % WISHES.length];
  return { ...wish, dateKey, reward: '完成后点亮今日星标' };
}

export function loadPracticeProfile(): PracticeProfile {
  if (typeof window === 'undefined') return { version: 2, completions: [], starts: [] };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { version: 2, completions: [], starts: [] };
    const parsed = JSON.parse(stored) as Partial<PracticeProfile>;
    return {
      version: 2,
      completions: Array.isArray(parsed.completions) ? parsed.completions : [],
      starts: Array.isArray(parsed.starts) ? parsed.starts : [],
    };
  } catch {
    return { version: 2, completions: [], starts: [] };
  }
}

export function recordPracticeStart(sessionId: string, mode: PracticeMode, startedAt = new Date().toISOString()): PracticeProfile {
  const profile = loadPracticeProfile();
  if (profile.starts.some(item => item.sessionId === sessionId)) return profile;
  const next: PracticeProfile = {
    version: 2,
    completions: profile.completions,
    starts: [{ sessionId, mode, startedAt, dateKey: getLocalDateKey(new Date(startedAt)) }, ...profile.starts].slice(0, 730),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('startrace-practice-updated'));
  } catch {
    return profile;
  }
  return next;
}

export function recordPracticeCompletion(
  completion: Omit<PracticeCompletion, 'completedAt' | 'dateKey'> & { completedAt?: string },
): PracticeProfile {
  const profile = loadPracticeProfile();
  if (profile.completions.some(item => item.sessionId === completion.sessionId)) return profile;

  const completedAt = completion.completedAt || new Date().toISOString();
  const dateKey = getLocalDateKey(new Date(completedAt));
  const next: PracticeProfile = {
    version: 2,
    completions: [{ ...completion, completedAt, dateKey }, ...profile.completions].slice(0, 365),
    starts: profile.starts,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('startrace-practice-updated'));
  } catch {
    return profile;
  }
  return next;
}

function calculateStreaks(activeDates: string[], today: Date) {
  const uniqueDates = [...new Set(activeDates)].sort();
  if (uniqueDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

  let bestStreak = 1;
  let running = 1;
  for (let index = 1; index < uniqueDates.length; index++) {
    const previous = dateFromKey(uniqueDates[index - 1]);
    const current = dateFromKey(uniqueDates[index]);
    const difference = Math.round((current.getTime() - previous.getTime()) / 86400000);
    running = difference === 1 ? running + 1 : 1;
    bestStreak = Math.max(bestStreak, running);
  }

  const active = new Set(uniqueDates);
  const todayKey = getLocalDateKey(today);
  const yesterday = addDays(today, -1);
  let cursor = active.has(todayKey) ? today : yesterday;
  let currentStreak = 0;
  while (active.has(getLocalDateKey(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  return { currentStreak, bestStreak };
}

export function getPracticeOverview(profile = loadPracticeProfile(), today = new Date()): PracticeOverview {
  const completionDates = [...new Set(profile.completions.map(item => item.dateKey))];
  const inferredLegacyStarts = profile.completions
    .filter(item => item.userStrokes > 0 && !profile.starts.some(start => start.sessionId === item.sessionId))
    .map(item => ({ sessionId: item.sessionId, dateKey: item.dateKey }));
  const actualStarts = [
    ...profile.starts.map(item => ({ sessionId: item.sessionId, dateKey: item.dateKey })),
    ...inferredLegacyStarts,
  ];
  const activeDates = [...new Set(actualStarts.map(item => item.dateKey))].sort();
  const todayKey = getLocalDateKey(today);
  const { currentStreak, bestStreak } = calculateStreaks(activeDates, today);
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });
  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    const dateKey = getLocalDateKey(date);
    return {
      dateKey,
      label: weekday.format(date).replace('周', ''),
      active: activeDates.includes(dateKey),
      isToday: dateKey === todayKey,
    };
  });

  return {
    todayWish: getDailyWish(today),
    todayCompleted: completionDates.includes(todayKey),
    currentStreak,
    bestStreak,
    totalSessions: profile.completions.length,
    totalPracticeStarts: new Set(actualStarts.map(item => item.sessionId)).size,
    activeDaysLast7: recentDays.filter(day => day.active).length,
    totalUserStrokes: profile.completions.reduce((sum, item) => sum + item.userStrokes, 0),
    totalMinutes: Math.round(profile.completions.reduce((sum, item) => sum + item.durationMs, 0) / 60000),
    activeDates,
    recentDays,
  };
}
