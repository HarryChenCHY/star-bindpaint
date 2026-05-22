'use client';

import { Brush, Play, Palette } from 'lucide-react';
import Dock from './Dock';
import { PaintMode } from './PaintCanvas';

interface PaintModeDockProps {
  current: PaintMode;
  onChange: (mode: PaintMode) => void;
}

const MODE_ORDER: PaintMode[] = ['follow', 'auto', 'free'];

export default function PaintModeDock({ current, onChange }: PaintModeDockProps) {
  const items = [
    {
      icon: <Brush size={22} strokeWidth={2.5} />,
      label: '跟画',
      color: '#F9B801',
      onClick: () => onChange('follow'),
    },
    {
      icon: <Play size={22} strokeWidth={2.5} />,
      label: '自动',
      color: '#F302C9',
      onClick: () => onChange('auto'),
    },
    {
      icon: <Palette size={22} strokeWidth={2.5} />,
      label: '自由',
      color: '#7DC353',
      onClick: () => onChange('free'),
    },
  ];

  const activeIndex = MODE_ORDER.indexOf(current);

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="relative pointer-events-auto">
        <Dock
          items={items}
          activeIndex={activeIndex}
          panelHeight={68}
          baseItemSize={50}
          magnification={72}
          distance={180}
        />
      </div>
    </div>
  );
}
