'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useInterfaceMotion } from './useInterfaceMotion';
import StarMoonScene from './StarMoonScene';

export type SceneKind = 'create' | 'paint' | 'free';
const destinations = { create: '/create', paint: '/paint', free: '/paint' } as const;
const SceneContext = createContext<{ begin: (kind: SceneKind) => void; isTransitioning: boolean }>({ begin: () => {}, isTransitioning: false });
export const useSceneTransition = () => useContext(SceneContext);

/** Lives above routes so navigation cannot unmount an unfinished transition. */
export function SceneTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useInterfaceMotion();
  const [scene, setScene] = useState<{ kind: SceneKind; origin: string } | null>(null);
  const locked = useRef(false);
  const navigated = useRef(false);
  const begin = useCallback((kind: SceneKind) => {
    if (locked.current) return;
    if (reduced) { router.push(destinations[kind]); return; }
    locked.current = true;
    navigated.current = false;
    setScene({ kind, origin: pathname });
    router.prefetch(destinations[kind]);
  }, [pathname, reduced, router]);
  const navigate = useCallback(() => {
    if (!scene || navigated.current) return;
    navigated.current = true;
    router.push(destinations[scene.kind]);
  }, [router, scene]);
  const finish = useCallback(() => {
    if (!scene || pathname !== destinations[scene.kind]) return;
    locked.current = false;
    setScene(null);
  }, [pathname, scene]);

  useEffect(() => {
    if (!scene) return;
    // A browser-back/other navigation cancels rather than redirecting the user again.
    const departed = pathname !== scene.origin && pathname !== destinations[scene.kind];
    if (!departed) return;
    const frame = requestAnimationFrame(() => {
      locked.current = false;
      setScene(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [scene, pathname]);
  useEffect(() => {
    if (scene) return;
    if (!navigated.current) return;
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1, .creation-main h1');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [scene]);
  const value = useMemo(() => ({ begin, isTransitioning: Boolean(scene) }), [begin, scene]);
  return <SceneContext.Provider value={value}>
    <div className="scene-route-content" inert={Boolean(scene)}>{children}</div>
    {scene && <StarMoonScene kind={scene.kind} reduced={reduced} routeReady={pathname === destinations[scene.kind]} destination={destinations[scene.kind]} onCovered={navigate} onFinish={finish} />}
  </SceneContext.Provider>;
}
