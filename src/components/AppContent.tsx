'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { SceneTransitionProvider } from '@/components/motion/SceneTransition';
import StarField from '@/components/motion/StarField';
import { useInterfaceMotion } from '@/components/motion/useInterfaceMotion';

export default function AppContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useInterfaceMotion();
  const themed = ['/', '/create', '/paint', '/gallery', '/intro', '/settings'].includes(pathname);
  return <SceneTransitionProvider><div className={`flex-1 flex flex-col${themed ? ' night-ui' : ''}`} data-ui-motion={reduced ? 'reduced' : 'full'}>{themed && <StarField quiet={pathname === '/paint'} />}{children}</div></SceneTransitionProvider>;
}
