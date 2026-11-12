'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Images } from 'lucide-react';
import PaintWorkspace, { type PaintEntry } from '@/components/creation/PaintWorkspace';
import '../creation.css';

export default function PaintPage() {
  const [entry, setEntry] = useState<PaintEntry | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setEntry({ mode: sessionStorage.getItem('startrace-creation-mode') === 'free' ? 'free' : 'co-create', source: sessionStorage.getItem('startrace-creation-source') });
      } catch {
        setEntry({ mode: 'co-create', source: null });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return <PaintWorkspace entry={entry} header={<>
    <Link href="/create"><ArrowLeft size={17} />创作入口</Link>
    <Link href="/gallery"><Images size={17} />我的星图</Link>
  </>} />;
}
