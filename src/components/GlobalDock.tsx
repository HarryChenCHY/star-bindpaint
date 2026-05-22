'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Palette,
  Image as ImageIcon,
  BookOpen,
  FileText,
  Settings,
} from 'lucide-react';
import Dock from './Dock';

export default function GlobalDock() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (pathname?.startsWith('/paint')) return null;

  const iconSize = isMobile ? 18 : 22;
  const items = [
    { icon: <Home size={iconSize} strokeWidth={2.5} />, label: '主页', color: '#F9B801', onClick: () => router.push('/') },
    { icon: <Palette size={iconSize} strokeWidth={2.5} />, label: '创作', color: '#F302C9', onClick: () => router.push('/onboard') },
    { icon: <ImageIcon size={iconSize} strokeWidth={2.5} />, label: '画廊', color: '#7DC353', onClick: () => router.push('/gallery') },
    { icon: <BookOpen size={iconSize} strokeWidth={2.5} />, label: '了解', color: '#7A51EC', onClick: () => router.push('/intro') },
    { icon: <FileText size={iconSize} strokeWidth={2.5} />, label: '报告', color: '#7BA7CC', onClick: () => router.push('/report') },
    { icon: <Settings size={iconSize} strokeWidth={2.5} />, label: '设置', color: '#1A1A1A', onClick: () => router.push('/settings') },
  ];

  return (
    <div className="fixed bottom-2 sm:bottom-3 left-0 right-0 z-50 flex justify-center pointer-events-none px-2">
      <div className="relative pointer-events-auto">
        <Dock
          items={items}
          panelHeight={isMobile ? 56 : 68}
          baseItemSize={isMobile ? 40 : 50}
          magnification={isMobile ? 54 : 72}
          distance={isMobile ? 100 : 180}
        />
      </div>
    </div>
  );
}
