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
    { icon: <Palette size={iconSize} strokeWidth={2.5} />, label: '开始', color: '#FF8FAB', onClick: () => router.push('/create') },
    { icon: <ImageIcon size={iconSize} strokeWidth={2.5} />, label: '星图', color: '#69D2C2', onClick: () => router.push('/gallery') },
    { icon: <BookOpen size={iconSize} strokeWidth={2.5} />, label: '世界', color: '#6558D9', onClick: () => router.push('/intro') },
    { icon: <FileText size={iconSize} strokeWidth={2.5} />, label: '反馈', color: '#7BA7CC', onClick: () => router.push('/report') },
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
