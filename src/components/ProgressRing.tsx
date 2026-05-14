'use client';

import { motion } from 'framer-motion';

interface ProgressRingProps {
  progress: number;  // 0-1
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function ProgressRing({ progress, size = 80, strokeWidth = 6, label }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-text-muted">{label}</span>}
    </div>
  );
}
