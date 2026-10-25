'use client';

import { useEffect, useState } from 'react';
import { Sparkle } from 'lucide-react';
import { useInterfaceMotion } from '@/components/motion/useInterfaceMotion';

/** A single acknowledgement after the material batch actually commits. */
export default function MaterialConfirmation({ x, y }: { x: number; y: number }) {
  const reduced = useInterfaceMotion();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 1000);
    return () => clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return <div className="material-confirmation" data-reduced={reduced} aria-hidden="true"
    style={{ left: `${Math.max(4, Math.min(96, x / 640 * 100))}%`, top: `${Math.max(5, Math.min(95, y / 480 * 100))}%` }}>
    <Sparkle size={24} strokeWidth={1.7} />
  </div>;
}
