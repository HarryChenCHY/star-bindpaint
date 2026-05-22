'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';

function isDarkHex(hex) {
  const c = (hex || '').replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Rec. 601 relative luminance, 0–1
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function DockItem({
  children,
  className = '',
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  accentColor = '#F9B801',
  isActive = false,
}) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);
  const [hovered, setHovered] = useState(false);

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  );
  const size = useSpring(targetSize, spring);

  const showAccent = hovered || isActive;
  const iconColor = showAccent && isDarkHex(accentColor) ? '#FFFFFF' : '#1A1A1A';

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size,
        background: showAccent ? accentColor : '#FFFFFF',
        border: '2px solid #1A1A1A',
        boxShadow: isActive ? '2px 2px 0 #1A1A1A' : 'none',
      }}
      onHoverStart={() => { isHovered.set(1); setHovered(true); }}
      onHoverEnd={() => { isHovered.set(0); setHovered(false); }}
      onFocus={() => { isHovered.set(1); setHovered(true); }}
      onBlur={() => { isHovered.set(0); setHovered(false); }}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full cursor-pointer transition-colors duration-150 ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      aria-pressed={isActive}
    >
      {Children.map(children, (child) => cloneElement(child, { isHovered, iconColor }))}
    </motion.div>
  );
}

function DockLabel({ children, className = '', ...rest }) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.18 }}
          className={`${className} absolute -top-8 left-1/2 w-fit whitespace-pre rounded-md px-2.5 py-1 text-xs`}
          role="tooltip"
          style={{
            x: '-50%',
            background: '#1A1A1A',
            color: '#FFFFFF',
            border: '2px solid #1A1A1A',
            fontWeight: 800,
            letterSpacing: '-0.01em',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '', iconColor = '#1A1A1A' }) {
  return (
    <div
      className={`flex items-center justify-center transition-colors duration-150 ${className}`}
      style={{ color: iconColor }}
    >
      {children}
    </div>
  );
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 72,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50,
  activeIndex = -1,
}) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  );
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div
      style={{ height, scrollbarWidth: 'none' }}
      className="mx-2 flex max-w-full items-center"
    >
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={`${className} absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-end w-fit max-w-[calc(100vw-1rem)] gap-2 sm:gap-4 rounded-2xl pb-2 px-2 sm:px-4`}
        style={{
          height: panelHeight,
          background: '#FFFFFF',
          border: '2px solid #1A1A1A',
          boxShadow: '4px 4px 0 #1A1A1A',
        }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            accentColor={item.color}
            isActive={index === activeIndex}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}
