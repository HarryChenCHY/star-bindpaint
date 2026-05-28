'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brush,
  Music2,
  FastForward,
  Sparkles,
  RotateCcw,
  ChevronsRight,
  Star,
  Pencil,
  Wand2,
  Palette as PaletteIcon,
  Play,
  Layers,
  ChevronDown,
  Undo2,
  Eraser,
  SprayCan,
} from 'lucide-react';
import { MASTER_STYLES, MasterStyleProfile } from '@/lib/style-transfer';

type PaintMode = 'follow' | 'auto' | 'free';

interface Props {
  mode: PaintMode;
  onModeChange: (m: PaintMode) => void;
  onEnterAutoMode?: () => void;

  brushWidth: number;
  onBrushWidthChange: (w: number) => void;

  guideSubMode: 'assist' | 'real';
  onGuideSubModeChange: (m: 'assist' | 'real') => void;

  fillMode: 'companion' | 'precise';
  onFillModeChange: (m: 'companion' | 'precise') => void;
  autoFillRatio: number;
  onAutoFillRatioChange: (n: number) => void;

  autoSpeed: number;
  onAutoSpeedChange: (s: number) => void;

  totalStrokes: number;
  currentStrokeIdx: number;
  onBatchDraw: (count: number) => void;

  onSkip: () => void;
  onReset: () => void;

  // free mode
  selectedStyle?: MasterStyleProfile | null;
  onSelectStyle?: (s: MasterStyleProfile) => void;
  freeColor?: [number, number, number];
  onFreeColorChange?: (c: [number, number, number]) => void;
  freeSat?: number;
  onFreeSatChange?: (s: number) => void;
  freeVal?: number;
  onFreeValChange?: (v: number) => void;
  onSDRender?: () => void;
  sdRendering?: boolean;
  // free mode edit tools
  eraserMode?: boolean;
  onToggleEraser?: () => void;
  sprayMode?: boolean;
  onToggleSpray?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
}

// ─── Animation presets ────────────────────────────────────────────
const POPOVER_SPRING = { type: 'spring' as const, stiffness: 380, damping: 24, mass: 0.55 };
const POPOVER_INITIAL = { opacity: 0, scale: 0.6, y: 24, rotate: -3 };
const POPOVER_ANIMATE = { opacity: 1, scale: 1, y: 0, rotate: 0 };
const POPOVER_EXIT = {
  opacity: 0,
  scale: 0.7,
  y: 18,
  rotate: 3,
  transition: { duration: 0.16, ease: 'easeIn' as const },
};

// ─── Main component ───────────────────────────────────────────────
export default function PaintBottomBar({ eraserMode, onToggleEraser, sprayMode, onToggleSpray, freeSat, onFreeSatChange, freeVal, onFreeValChange, canUndo, onUndo, ...p }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(null);
  }, [p.mode]);

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key: string) => setOpen(prev => (prev === key ? null : key));
  const close = () => setOpen(null);

  const MODES: { id: PaintMode; icon: ReactNode; label: string; color: string }[] = [
    { id: 'follow', icon: <Brush size={20} strokeWidth={2.5} />, label: '跟画', color: '#F9B801' },
    { id: 'auto', icon: <Play size={20} strokeWidth={2.5} />, label: '自动', color: '#F302C9' },
    { id: 'free', icon: <PaletteIcon size={20} strokeWidth={2.5} />, label: '自由', color: '#7DC353' },
  ];

  if (collapsed) {
    return (
      <div className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none px-2"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <motion.button
          type="button"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.92 }}
          className="pointer-events-auto rounded-full flex items-center justify-center bg-white"
          style={{
            width: 52,
            height: 52,
            border: '2px solid #1A1A1A',
            boxShadow: '4px 4px 0 #1A1A1A',
            color: '#1A1A1A',
          }}
          onClick={() => setCollapsed(false)}
          aria-label="展开工具栏"
          title="展开工具栏"
        >
          <PaletteIcon size={22} strokeWidth={2.6} />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none px-1.5"
      style={{ bottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <motion.div
        ref={containerRef}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 px-1.5 py-1.5 rounded-[1.35rem] bg-white max-w-[calc(100vw-0.75rem)] sm:flex-nowrap sm:gap-1.5 sm:px-2 sm:py-2 sm:rounded-[1.5rem]"
        style={{ border: '2px solid #1A1A1A', boxShadow: '4px 4px 0 #1A1A1A' }}
      >
        {/* MODE SECTION — 自由模式一旦进入即锁定，其余两个模式按钮隐藏 */}
        {(p.mode === 'free' ? MODES.filter(m => m.id === 'free') : MODES).map(m => (
          <ModeBtn
            key={m.id}
            icon={m.icon}
            label={m.label}
            color={m.color}
            active={p.mode === m.id}
            onClick={() => {
              if (p.mode === 'free' && m.id !== 'free') return;
              if (m.id === 'auto' && p.mode === 'follow' && p.onEnterAutoMode) {
                p.onEnterAutoMode();
                return;
              }
              p.onModeChange(m.id);
            }}
          />
        ))}

        <Divider />

        {/* FOLLOW MODE TOOLS */}
        {p.mode === 'follow' && (
          <>
            <ToolBtn
              icon={<Brush size={18} strokeWidth={2.5} />}
              label="粗细"
              value={String(p.brushWidth)}
              isOpen={open === 'brush'}
              onClick={() => toggle('brush')}
              popover={<BrushPopover width={p.brushWidth} onChange={p.onBrushWidthChange} />}
            />
            <ToolBtn
              icon={<Layers size={18} strokeWidth={2.5} />}
              label="跟画模式"
              value={p.guideSubMode === 'assist' ? '辅助' : '真实'}
              isOpen={open === 'submode'}
              onClick={() => toggle('submode')}
              popover={<SubModePopover value={p.guideSubMode} onChange={p.onGuideSubModeChange} />}
            />
            <ToolBtn
              icon={<Music2 size={18} strokeWidth={2.5} />}
              label="节奏"
              value={p.fillMode === 'companion' ? `1:${p.autoFillRatio}` : '自己'}
              isOpen={open === 'rhythm'}
              onClick={() => toggle('rhythm')}
              popover={
                <RhythmPopover
                  fillMode={p.fillMode}
                  onFillModeChange={p.onFillModeChange}
                  autoFillRatio={p.autoFillRatio}
                  onAutoFillRatioChange={p.onAutoFillRatioChange}
                />
              }
            />
            <ToolBtn
              icon={<Sparkles size={18} strokeWidth={2.5} />}
              label="Starry 帮画"
              isOpen={open === 'batch'}
              onClick={() => toggle('batch')}
              popover={
                <BatchPopover
                  onBatchDraw={p.onBatchDraw}
                  totalStrokes={p.totalStrokes}
                  currentStrokeIdx={p.currentStrokeIdx}
                  onClose={close}
                />
              }
            />
            <DirectBtn
              icon={<ChevronsRight size={18} strokeWidth={2.5} />}
              label="换一笔"
              onClick={p.onSkip}
              hoverBg="#F9B801"
            />
          </>
        )}

        {/* AUTO MODE TOOLS */}
        {p.mode === 'auto' && (
          <ToolBtn
            icon={<FastForward size={18} strokeWidth={2.5} />}
            label="快慢"
            value={p.autoSpeed === 0 ? '快' : `${p.autoSpeed}`}
            isOpen={open === 'speed'}
            onClick={() => toggle('speed')}
            popover={<SpeedPopover value={p.autoSpeed} onChange={p.onAutoSpeedChange} />}
          />
        )}

        {/* FREE MODE TOOLS */}
        {p.mode === 'free' && (
          <>
            <ToolBtn
              icon={<Brush size={18} strokeWidth={2.5} />}
              label="画笔"
              value={String(p.brushWidth)}
              isOpen={open === 'brush'}
              onClick={() => {
                if (eraserMode && onToggleEraser) onToggleEraser();
                toggle('brush');
              }}
              popover={<BrushPopover width={p.brushWidth} onChange={p.onBrushWidthChange} />}
            />
            {p.freeColor && p.onFreeColorChange && (
              <ToolBtn
                icon={
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{
                      background: `rgb(${Math.round(p.freeColor[0] * 255)},${Math.round(
                        p.freeColor[1] * 255
                      )},${Math.round(p.freeColor[2] * 255)})`,
                      border: '2px solid #1A1A1A',
                    }}
                  />
                }
                label="颜色"
                isOpen={open === 'color'}
                onClick={() => toggle('color')}
                popover={<ColorPopover value={p.freeColor} onChange={p.onFreeColorChange!} sat={freeSat ?? 1} onSatChange={onFreeSatChange!} val={freeVal ?? 1} onValChange={onFreeValChange!} />}
              />
            )}
            {p.onSelectStyle && (() => {
              const current = p.selectedStyle || MASTER_STYLES[1]; // 默认梵高
              return (
                <ToolBtn
                  icon={
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ background: current.color, border: '2px solid #1A1A1A' }}
                    />
                  }
                  label="风格"
                  value={current.name}
                  isOpen={open === 'style'}
                  onClick={() => toggle('style')}
                  popover={<StylePopover selected={current} onSelect={p.onSelectStyle!} />}
                />
              );
            })()}
            {onUndo && (
              <DirectBtn
                icon={<Undo2 size={18} strokeWidth={2.5} />}
                label="撤销"
                onClick={onUndo}
                disabled={!canUndo}
              />
            )}
            {onToggleEraser && (
              <DirectBtn
                icon={<Eraser size={18} strokeWidth={2.5} />}
                label="橡皮擦"
                onClick={onToggleEraser}
                fillBg={eraserMode ? '#1A1A1A' : undefined}
                iconColor={eraserMode ? '#FFFFFF' : undefined}
              />
            )}
            {onToggleSpray && (
              <DirectBtn
                icon={<SprayCan size={18} strokeWidth={2.5} />}
                label="喷枪"
                onClick={onToggleSpray}
                fillBg={sprayMode ? '#7A51EC' : undefined}
                iconColor={sprayMode ? '#FFFFFF' : undefined}
              />
            )}
            {p.onSDRender && (
              <DirectBtn
                icon={<Wand2 size={17} strokeWidth={2.5} />}
                label="变成油画"
                onClick={p.onSDRender}
                disabled={p.sdRendering}
                fillBg="#7A51EC"
                iconColor="#FFFFFF"
                showLabel
              />
            )}
          </>
        )}

        <Divider />

        {/* COMMON ACTIONS */}
        <DirectBtn
          icon={<RotateCcw size={18} strokeWidth={2.5} />}
          label="重新开始"
          onClick={() => {
            if (confirm('重新开始？')) p.onReset();
          }}
          hoverBg="#F302C9"
        />
        <DirectBtn
          icon={<ChevronDown size={18} strokeWidth={2.6} />}
          label="收起工具栏"
          onClick={() => {
            setOpen(null);
            setCollapsed(true);
          }}
          hoverBg="#7DC353"
        />
      </motion.div>
    </div>
  );
}

// ─── HoverTip ─────────────────────────────────────────────────────
function HoverTip({ show, label }: { show: boolean; label: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 480, damping: 26 }}
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap"
          style={{
            bottom: 'calc(100% + 10px)',
            background: '#1A1A1A',
            color: '#FFFFFF',
            border: '2px solid #1A1A1A',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '-0.01em',
            zIndex: 20,
          }}
        >
          {label}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── ModeBtn ──────────────────────────────────────────────────────
function ModeBtn({
  icon,
  label,
  color,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={onClick}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="relative w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
        style={{
          background: active ? color : '#FFFFFF',
          border: '2px solid #1A1A1A',
          boxShadow: active ? '2px 2px 0 #1A1A1A' : 'none',
          color: '#1A1A1A',
        }}
      >
        {icon}
        {active && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="absolute -top-1 -right-1 rounded-full"
            style={{
              width: 10,
              height: 10,
              background: '#1A1A1A',
              border: '2px solid #FFFFFF',
            }}
          />
        )}
      </motion.button>
      <HoverTip show={hover} label={label} />
    </div>
  );
}

// ─── ToolBtn (with popover) ───────────────────────────────────────
function ToolBtn({
  icon,
  label,
  value,
  isOpen,
  onClick,
  popover,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  isOpen: boolean;
  onClick: () => void;
  popover: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div className="relative">
      <motion.button
        onClick={onClick}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={isOpen ? { y: -2 } : { y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex flex-col items-center justify-center"
        style={{
          background: isOpen ? '#1A1A1A' : '#FFFFFF',
          color: isOpen ? '#FFFFFF' : '#1A1A1A',
          border: '2px solid #1A1A1A',
          boxShadow: isOpen ? '2px 2px 0 #7A51EC' : 'none',
        }}
      >
        {icon}
        {value !== undefined && (
          <span
            style={{
              fontSize: 'clamp(0.48rem, 1.7vw, 0.55rem)',
              fontWeight: 900,
              lineHeight: 1,
              marginTop: 2,
              letterSpacing: '-0.02em',
            }}
          >
            {value}
          </span>
        )}
      </motion.button>

      <HoverTip show={hover && !isOpen} label={label} />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={POPOVER_INITIAL}
            animate={POPOVER_ANIMATE}
            exit={POPOVER_EXIT}
            transition={POPOVER_SPRING}
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{
              bottom: 'calc(100% + 10px)',
              transformOrigin: 'bottom center',
            }}
          >
            <div
              className="rounded-[1.25rem] bg-white"
              style={{
                border: '2px solid #1A1A1A',
                boxShadow: '4px 4px 0 #1A1A1A',
                padding: '0.8rem 0.85rem 0.9rem',
                maxWidth: 'calc(100vw - 1.25rem)',
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  color: '#1A1A1A',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                {label}
              </div>
              {popover}
            </div>
            {/* Pointer arrow */}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                width: 14,
                height: 14,
                background: '#FFFFFF',
                borderRight: '2px solid #1A1A1A',
                borderBottom: '2px solid #1A1A1A',
                transform: 'translate(-50%, -50%) rotate(45deg)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── DirectBtn (no popover) ───────────────────────────────────────
function DirectBtn({
  icon,
  label,
  onClick,
  disabled = false,
  hoverBg,
  fillBg,
  iconColor,
  showLabel = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hoverBg?: string;
  fillBg?: string;
  iconColor?: string;
  showLabel?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const baseBg = fillBg || '#FFFFFF';
  const currentBg = disabled ? '#E5E5E5' : hover && hoverBg ? hoverBg : baseBg;
  const currentColor = disabled ? '#999' : iconColor || '#1A1A1A';

  return (
    <div className="relative">
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.1 } : undefined}
        whileTap={!disabled ? { scale: 0.9 } : undefined}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        className="rounded-full flex items-center justify-center gap-1.5"
        style={{
          height: 'clamp(36px, 10vw, 48px)',
          minWidth: 'clamp(36px, 10vw, 48px)',
          padding: showLabel ? '0 clamp(0.55rem, 2.4vw, 0.95rem)' : 0,
          background: currentBg,
          color: currentColor,
          border: '2px solid #1A1A1A',
          boxShadow: !disabled && (hover || fillBg) ? '2px 2px 0 #1A1A1A' : 'none',
          opacity: disabled ? 0.65 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.18s ease, box-shadow 0.18s ease',
        }}
      >
        {icon}
        {showLabel && (
          <span className="hidden sm:inline" style={{ fontSize: '0.78rem', fontWeight: 900, letterSpacing: '-0.01em' }}>
            {label}
          </span>
        )}
      </motion.button>
      <HoverTip show={hover && !disabled && !showLabel} label={label} />
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      className="self-stretch mx-1"
      style={{
        width: 2,
        background: '#1A1A1A',
        opacity: 0.12,
        borderRadius: 1,
        marginTop: 6,
        marginBottom: 6,
      }}
    />
  );
}

// ─── Popovers ─────────────────────────────────────────────────────
function BrushPopover({ width, onChange }: { width: number; onChange: (w: number) => void }) {
  return (
    <div style={{ width: 224 }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#888' }}>大小</span>
        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1A1A1A' }}>{width}</span>
      </div>
      <input
        type="range"
        min="1"
        max="20"
        step="1"
        value={width}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: '#7A51EC', background: '#E5E5E5' }}
      />
      <div className="flex justify-between mt-3 gap-1">
        {[2, 6, 12, 20].map(s => {
          const active = width === s;
          const dot = Math.max(3, Math.min(s, 18));
          return (
            <motion.button
              key={s}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(s)}
              className="rounded-full flex items-center justify-center"
              style={{
                width: 38,
                height: 38,
                background: active ? '#1A1A1A' : '#FFFFFF',
                border: '2px solid #1A1A1A',
                boxShadow: active ? '2px 2px 0 #7A51EC' : 'none',
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: dot,
                  height: dot,
                  background: active ? '#FFFFFF' : '#1A1A1A',
                }}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function SubModePopover({
  value,
  onChange,
}: {
  value: 'assist' | 'real';
  onChange: (v: 'assist' | 'real') => void;
}) {
  return (
    <div style={{ width: 224 }}>
      <div className="flex gap-2">
        {(['assist', 'real'] as const).map(m => {
          const active = value === m;
          return (
            <motion.button
              key={m}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange(m)}
              className="flex-1 py-2.5 rounded-xl"
              style={{
                background: active ? '#F9B801' : '#FFFFFF',
                border: '2px solid #1A1A1A',
                fontWeight: 900,
                fontSize: '0.85rem',
                color: '#1A1A1A',
                boxShadow: active ? '2px 2px 0 #1A1A1A' : 'none',
              }}
            >
              {m === 'assist' ? '辅助' : '真实'}
            </motion.button>
          );
        })}
      </div>
      <p style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>
        {value === 'assist' ? 'AI 笔触替换你的画迹' : '保留你的原始笔迹'}
      </p>
    </div>
  );
}

function RhythmPopover({
  fillMode,
  onFillModeChange,
  autoFillRatio,
  onAutoFillRatioChange,
}: {
  fillMode: 'companion' | 'precise';
  onFillModeChange: (m: 'companion' | 'precise') => void;
  autoFillRatio: number;
  onAutoFillRatioChange: (n: number) => void;
}) {
  return (
    <div style={{ width: 256 }}>
      <div className="flex gap-2 mb-3">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onFillModeChange('companion')}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          style={{
            background: fillMode === 'companion' ? '#1A1A1A' : '#FFFFFF',
            color: fillMode === 'companion' ? '#FFF' : '#1A1A1A',
            border: '2px solid #1A1A1A',
            fontWeight: 900,
            fontSize: '0.82rem',
            boxShadow: fillMode === 'companion' ? '2px 2px 0 #F9B801' : 'none',
          }}
        >
          <Star size={13} strokeWidth={2.5} fill={fillMode === 'companion' ? '#F9B801' : 'none'} />
          一起画
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onFillModeChange('precise')}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          style={{
            background: fillMode === 'precise' ? '#1A1A1A' : '#FFFFFF',
            color: fillMode === 'precise' ? '#FFF' : '#1A1A1A',
            border: '2px solid #1A1A1A',
            fontWeight: 900,
            fontSize: '0.82rem',
            boxShadow: fillMode === 'precise' ? '2px 2px 0 #F9B801' : 'none',
          }}
        >
          <Pencil size={13} strokeWidth={2.5} />
          自己画
        </motion.button>
      </div>
      {fillMode === 'companion' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.25 }}
          style={{ overflow: 'hidden' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ fontSize: '0.74rem', color: '#1A1A1A', fontWeight: 700 }}>
              Starry 帮多少
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#7A51EC' }}>
              1 : {autoFillRatio}
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="500"
            step="50"
            value={autoFillRatio}
            onChange={e => onAutoFillRatioChange(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: '#E5E5E5', accentColor: '#7A51EC' }}
          />
          <div className="flex justify-between mt-1">
            <span style={{ fontSize: '0.62rem', color: '#888', fontWeight: 700 }}>少一点</span>
            <span style={{ fontSize: '0.62rem', color: '#888', fontWeight: 700 }}>多一点</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function BatchPopover({
  onBatchDraw,
  totalStrokes,
  currentStrokeIdx,
  onClose,
}: {
  onBatchDraw: (n: number) => void;
  totalStrokes: number;
  currentStrokeIdx: number;
  onClose: () => void;
}) {
  const remaining = Math.max(0, totalStrokes - currentStrokeIdx);
  return (
    <div style={{ width: 224 }}>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {[10, 30, 50].map(n => (
          <motion.button
            key={n}
            whileHover={{ scale: 1.08, y: -1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              onBatchDraw(n);
              onClose();
            }}
            className="py-2 rounded-full"
            style={{
              background: '#FFFFFF',
              border: '2px solid #1A1A1A',
              fontWeight: 900,
              fontSize: '0.85rem',
              color: '#1A1A1A',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget;
              b.style.background = '#F9B801';
              b.style.boxShadow = '2px 2px 0 #1A1A1A';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget;
              b.style.background = '#FFFFFF';
              b.style.boxShadow = 'none';
            }}
          >
            +{n}
          </motion.button>
        ))}
      </div>
      <motion.button
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          onBatchDraw(remaining);
          onClose();
        }}
        className="w-full py-2.5 rounded-full flex items-center justify-center gap-1.5"
        style={{
          background: '#7DC353',
          border: '2px solid #1A1A1A',
          fontWeight: 900,
          fontSize: '0.85rem',
          color: '#1A1A1A',
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '2px 2px 0 #1A1A1A';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Wand2 size={14} strokeWidth={2.5} /> 全部画完
      </motion.button>
    </div>
  );
}

function SpeedPopover({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ width: 224 }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#888' }}>播放速度</span>
        <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1A1A1A' }}>
          {value === 0 ? '最快' : `${value}ms`}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="200"
        step="10"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: '#F302C9', background: '#E5E5E5' }}
      />
    </div>
  );
}

const FREE_COLORS: { color: [number, number, number]; label: string }[] = [
  { color: [0.9, 0.2, 0.2], label: '红' },
  { color: [0.95, 0.6, 0.1], label: '橙' },
  { color: [0.95, 0.85, 0.1], label: '黄' },
  { color: [0.2, 0.7, 0.3], label: '绿' },
  { color: [0.1, 0.3, 0.7], label: '蓝' },
  { color: [0.5, 0.2, 0.8], label: '紫' },
  { color: [0.85, 0.4, 0.6], label: '粉' },
  { color: [0.1, 0.1, 0.1], label: '黑' },
  { color: [0.95, 0.93, 0.88], label: '白' },
];

function ColorPopover({
  value,
  onChange,
  sat = 1,
  onSatChange,
  val = 1,
  onValChange,
}: {
  value: [number, number, number];
  onChange: (c: [number, number, number]) => void;
  sat?: number;
  onSatChange?: (s: number) => void;
  val?: number;
  onValChange?: (v: number) => void;
}) {
  const shadeR = Math.round(value[0] * sat * val * 255);
  const shadeG = Math.round(value[1] * sat * val * 255);
  const shadeB = Math.round(value[2] * sat * val * 255);

  return (
    <div style={{ width: 260 }}>
      <div className="grid grid-cols-5 gap-2">
        {FREE_COLORS.map(c => {
          const active = value[0] === c.color[0] && value[1] === c.color[1] && value[2] === c.color[2];
          return (
            <motion.button
              key={c.label}
              onClick={() => onChange(c.color)}
              whileHover={{ scale: 1.18 }}
              whileTap={{ scale: 0.88 }}
              animate={active ? { y: -2 } : { y: 0 }}
              className="rounded-full"
              style={{
                width: 34,
                height: 34,
                background: `rgb(${Math.round(c.color[0] * 255)},${Math.round(c.color[1] * 255)},${Math.round(c.color[2] * 255)})`,
                border: active ? '3px solid #1A1A1A' : '2px solid #1A1A1A',
                boxShadow: active ? '2px 2px 0 #1A1A1A' : 'none',
              }}
              title={c.label}
            />
          );
        })}
      </div>

      {(onSatChange || onValChange) && (
        <div className="mt-3 pt-3" style={{ borderTop: '2px solid #E5E5E5' }}>
          {/* 实时预览色块 */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="rounded-xl flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                background: `rgb(${shadeR},${shadeG},${shadeB})`,
                border: '2px solid #1A1A1A',
                boxShadow: '2px 2px 0 #1A1A1A',
              }}
            />
            <div className="min-w-0">
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1A1A1A' }}>预览</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#999', marginLeft: 4, wordBreak: 'break-all' }}>
                {shadeR},{shadeG},{shadeB}
              </span>
            </div>
          </div>

          {/* 饱和度滑块 */}
          {onSatChange && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888' }}>饱和度</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1A1A1A' }}>{Math.round(sat * 100)}%</span>
              </div>
              <div
                className="relative w-full cursor-pointer"
                style={{ height: 24, touchAction: 'none' }}
                onPointerDown={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  onSatChange(Math.round((0.2 + pct * 1.3) / 0.05) * 0.05);
                }}
                onPointerMove={e => {
                  if (e.buttons === 1) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    onSatChange(Math.round((0.2 + pct * 1.3) / 0.05) * 0.05);
                  }
                }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 w-full rounded-full" style={{ height: 6, background: '#E5E5E5' }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-full"
                  style={{ height: 6, background: '#1A1A1A', width: `${((sat - 0.2) / 1.3) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
                  style={{
                    width: 18, height: 18,
                    left: `calc(${((sat - 0.2) / 1.3) * 100}% - 9px)`,
                    borderColor: '#1A1A1A',
                    boxShadow: '2px 2px 0 #1A1A1A',
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span style={{ fontSize: '0.6rem', color: '#888', fontWeight: 700 }}>灰</span>
                <span style={{ fontSize: '0.6rem', color: '#888', fontWeight: 700 }}>艳</span>
              </div>
            </div>
          )}

          {/* 亮度滑块 */}
          {onValChange && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888' }}>亮度</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1A1A1A' }}>{Math.round(val * 100)}%</span>
              </div>
              <div
                className="relative w-full cursor-pointer"
                style={{ height: 24, touchAction: 'none' }}
                onPointerDown={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  onValChange(Math.round((0.2 + pct * 1.3) / 0.05) * 0.05);
                }}
                onPointerMove={e => {
                  if (e.buttons === 1) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    onValChange(Math.round((0.2 + pct * 1.3) / 0.05) * 0.05);
                  }
                }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 w-full rounded-full" style={{ height: 6, background: '#E5E5E5' }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-full"
                  style={{ height: 6, background: '#1A1A1A', width: `${((val - 0.2) / 1.3) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
                  style={{
                    width: 18, height: 18,
                    left: `calc(${((val - 0.2) / 1.3) * 100}% - 9px)`,
                    borderColor: '#1A1A1A',
                    boxShadow: '2px 2px 0 #1A1A1A',
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span style={{ fontSize: '0.6rem', color: '#888', fontWeight: 700 }}>暗</span>
                <span style={{ fontSize: '0.6rem', color: '#888', fontWeight: 700 }}>亮</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StylePopover({
  selected,
  onSelect,
}: {
  selected: MasterStyleProfile;
  onSelect: (s: MasterStyleProfile) => void;
}) {
  return (
    <div style={{ width: 280 }}>
      <div className="grid grid-cols-3 gap-2">
        {MASTER_STYLES.map(s => {
          const active = selected.id === s.id;
          return (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelect(s)}
              className="rounded-xl p-2.5 flex flex-col items-center gap-1.5"
              style={{
                border: '2px solid #1A1A1A',
                background: active ? s.color + '22' : '#FFFFFF',
                boxShadow: active ? '2px 2px 0 #1A1A1A' : 'none',
              }}
            >
              <div
                className="rounded-full"
                style={{ width: 26, height: 26, background: s.color, border: '2px solid #1A1A1A' }}
              />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1A1A1A' }}>{s.name}</span>
            </motion.button>
          );
        })}
      </div>
      <p style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600, marginTop: 10, lineHeight: 1.5 }}>
        {selected.description}
      </p>
    </div>
  );
}
