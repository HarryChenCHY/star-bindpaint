/** 每个自由创作主题对应一张固定全画布描线场景图 */
export const THEME_TRACING_SCENES: Record<string, string> = {
  weather: '/tracing/scenes/weather.svg',
  mood: '/tracing/scenes/mood.svg',
  safe_place: '/tracing/scenes/safe_place.svg',
  slow_line: '/tracing/scenes/slow_line.svg',
  planet: '/tracing/scenes/planet.svg',
  kitty: '/tracing/scenes/kitty.svg',
  bunny: '/tracing/scenes/bunny.svg',
  fish: '/tracing/scenes/fish.svg',
};

export function createThemeTracingRef(
  themeId: string,
  canvasW: number,
  canvasH: number,
): { id: string; src: string; x: number; y: number; width: number; height: number; visible: boolean; locked: boolean } | null {
  const src = THEME_TRACING_SCENES[themeId];
  if (!src) return null;
  const size = Math.min(canvasW, canvasH) * 0.88;
  return {
    id: 'theme-scene',
    src,
    x: canvasW / 2,
    y: canvasH / 2,
    width: size,
    height: size,
    visible: true,
    locked: true,
  };
}
