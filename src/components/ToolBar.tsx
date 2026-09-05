'use client';

import {
  Brush,
  Music2,
  FastForward,
  Sparkles,
  ChevronsRight,
  RotateCcw,
  ImagePlus,
  Star,
  Pencil,
  Wand2,
} from 'lucide-react';

interface ToolBarProps {
  brushWidth: number;
  onBrushWidthChange: (w: number) => void;
  guideSubMode: 'assist' | 'real';
  onGuideSubModeChange: (m: 'assist' | 'real') => void;
  autoSpeed: number;
  onAutoSpeedChange: (s: number) => void;
  fillMode?: 'companion' | 'precise';
  onFillModeChange?: (m: 'companion' | 'precise') => void;
  autoFillRatio?: number;
  onAutoFillRatioChange?: (n: number) => void;
  showSubMode?: boolean;
  showSpeed?: boolean;
  showFillMode?: boolean;
  onReset?: () => void;
  onSkip?: () => void;
  onBatchDraw?: (count: number) => void;
  onExport?: () => void;
  totalStrokes?: number;
  currentStrokeIdx?: number;
}

const labelStyle = {
  fontSize: '0.7rem',
  color: '#888888',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
};

const divider = { height: 2, background: '#1A1A1A', margin: '4px 0', opacity: 0.08 };

// Shared neo-brutalist button base (white bg, 2px black border, hard shadow on hover)
const nbButtonBase: React.CSSProperties = {
  border: '2px solid #1A1A1A',
  background: '#FFFFFF',
  color: '#1A1A1A',
  fontWeight: 800,
  fontSize: '0.78rem',
  letterSpacing: '-0.01em',
  transition: 'all 0.15s ease',
};

const SegmentToggle = <T extends string>({
  value,
  options,
  onChange,
  activeColor = '#F9B801',
}: {
  value: T;
  options: { id: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  activeColor?: string;
}) => (
  <div
    className="flex gap-0 p-0.5 rounded-full"
    style={{ background: '#FFFFFF', border: '2px solid #1A1A1A' }}
  >
    {options.map(opt => {
      const active = value === opt.id;
      return (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className="flex-1 px-3 py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5"
          style={{
            background: active ? activeColor : 'transparent',
            color: active ? '#1A1A1A' : '#888888',
            fontWeight: 800,
            fontSize: '0.78rem',
            letterSpacing: '-0.01em',
          }}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      );
    })}
  </div>
);

export default function ToolBar({
  brushWidth,
  onBrushWidthChange,
  guideSubMode,
  onGuideSubModeChange,
  autoSpeed,
  onAutoSpeedChange,
  fillMode = 'companion',
  onFillModeChange,
  autoFillRatio = 10,
  onAutoFillRatioChange,
  showSubMode = false,
  showSpeed = false,
  showFillMode = false,
  onReset,
  onSkip,
  onBatchDraw,
  onExport,
  totalStrokes = 0,
  currentStrokeIdx = 0,
}: ToolBarProps) {
  return (
    <div className="flex flex-col gap-4 w-full">

      {/* 笔刷大小 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label style={labelStyle}>
            <Brush size={13} strokeWidth={2.5} /> 粗细
          </label>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1A1A1A' }}>{brushWidth}</span>
        </div>
        <input
          type="range" min="1" max="20" step="1" value={brushWidth}
          onChange={e => onBrushWidthChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none"
          style={{ accentColor: '#7A51EC', background: '#E5E5E5', cursor: 'pointer' }}
        />
      </div>

      {/* 跟画子模式 */}
      {showSubMode && (
        <>
          <div style={divider} />
          <div>
            <label style={{ ...labelStyle, display: 'flex', marginBottom: '0.5rem' }}>跟画模式</label>
            <SegmentToggle
              value={guideSubMode}
              activeColor="#F9B801"
              options={[
                { id: 'assist', label: '辅助' },
                { id: 'real', label: '真实' },
              ]}
              onChange={onGuideSubModeChange}
            />
            <p style={{ fontSize: '0.7rem', marginTop: '0.45rem', color: '#888', fontWeight: 600 }}>
              {guideSubMode === 'assist' ? 'AI 笔触替换你的画迹' : '保留你的原始笔迹'}
            </p>
          </div>
        </>
      )}

      {/* 绘画节奏 */}
      {showFillMode && onFillModeChange && (
        <>
          <div style={divider} />
          <div>
            <label style={{ ...labelStyle, display: 'flex', marginBottom: '0.5rem' }}>
              <Music2 size={13} strokeWidth={2.5} /> 节奏
            </label>
            <SegmentToggle
              value={fillMode}
              activeColor="#1A1A1A"
              options={[
                { id: 'companion', label: '一起画', icon: <Star size={12} strokeWidth={2.8} fill={fillMode === 'companion' ? '#FFD700' : 'none'} /> },
                { id: 'precise', label: '自己画', icon: <Pencil size={12} strokeWidth={2.8} /> },
              ]}
              onChange={onFillModeChange}
            />
            <p style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600, marginTop: 6 }}>
              {fillMode === 'companion'
                ? `你画 1 笔 → 月亮伙伴帮画 ${autoFillRatio} 笔`
                : '每一笔都由你来画'}
            </p>
            {fillMode === 'companion' && onAutoFillRatioChange && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: '0.7rem', color: '#1A1A1A', fontWeight: 700 }}>月亮伙伴帮多少</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#7A51EC' }}>1 : {autoFillRatio}</span>
                </div>
                <input
                  type="range" min="1" max="20" step="1" value={autoFillRatio}
                  onChange={e => onAutoFillRatioChange(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none"
                  style={{ background: '#E5E5E5', accentColor: '#7A51EC' }}
                />
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: '0.62rem', color: '#888', fontWeight: 700, letterSpacing: '0.04em' }}>少一点</span>
                  <span style={{ fontSize: '0.62rem', color: '#888', fontWeight: 700, letterSpacing: '0.04em' }}>多一点</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 播放速度 */}
      {showSpeed && (
        <>
          <div style={divider} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={labelStyle}>
                <FastForward size={13} strokeWidth={2.5} /> 快慢
              </label>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1A1A1A' }}>
                {autoSpeed === 0 ? '最快' : `${autoSpeed}ms`}
              </span>
            </div>
            <input
              type="range" min="0" max="200" step="10" value={autoSpeed}
              onChange={e => onAutoSpeedChange(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none"
              style={{ accentColor: '#F302C9', background: '#E5E5E5', cursor: 'pointer' }}
            />
          </div>
        </>
      )}

      {/* AI 批量绘制 */}
      {onBatchDraw && (
        <>
          <div style={divider} />
          <div>
            <label style={{ ...labelStyle, display: 'flex', marginBottom: '0.5rem' }}>
              <Sparkles size={13} strokeWidth={2.5} /> 月亮伙伴帮画
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[5, 10, 20].map(n => (
                <button
                  key={n}
                  onClick={() => onBatchDraw(n)}
                  className="py-2 rounded-full"
                  style={{
                    ...nbButtonBase,
                    fontWeight: 900,
                    fontSize: '0.85rem',
                  }}
                  onMouseEnter={e => {
                    const b = e.currentTarget;
                    b.style.background = '#F9B801';
                    b.style.transform = 'translate(-1px,-1px)';
                    b.style.boxShadow = '3px 3px 0 #1A1A1A';
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget;
                    b.style.background = '#FFFFFF';
                    b.style.transform = 'none';
                    b.style.boxShadow = 'none';
                  }}
                >
                  +{n}
                </button>
              ))}
            </div>
            <button
              onClick={() => onBatchDraw(totalStrokes - currentStrokeIdx)}
              className="w-full py-2.5 rounded-full flex items-center justify-center gap-1.5"
              style={{
                ...nbButtonBase,
                background: '#7DC353',
                fontSize: '0.85rem',
                fontWeight: 900,
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.transform = 'translate(-1px,-1px)';
                b.style.boxShadow = '3px 3px 0 #1A1A1A';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.transform = 'none';
                b.style.boxShadow = 'none';
              }}
            >
              <Wand2 size={14} strokeWidth={2.5} />
              <span>全部画完</span>
            </button>
          </div>
        </>
      )}

      {/* 操作按钮组 */}
      <div style={divider} />
      <div className="flex gap-2 items-center">
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              ...nbButtonBase,
              background: '#FFF8E0',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget;
              b.style.background = '#F9B801';
              b.style.transform = 'translate(-1px,-1px)';
              b.style.boxShadow = '3px 3px 0 #1A1A1A';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget;
              b.style.background = '#FFF8E0';
              b.style.transform = 'none';
              b.style.boxShadow = 'none';
            }}
            title="换一笔"
          >
            <ChevronsRight size={18} strokeWidth={2.5} color="#1A1A1A" />
          </button>
        )}
        {onReset && (
          <button
            onClick={() => { if (confirm('重新开始？')) onReset(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              ...nbButtonBase,
              background: '#FFF0F8',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget;
              b.style.background = '#F302C9';
              b.style.transform = 'translate(-1px,-1px)';
              b.style.boxShadow = '3px 3px 0 #1A1A1A';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget;
              b.style.background = '#FFF0F8';
              b.style.transform = 'none';
              b.style.boxShadow = 'none';
            }}
            title="重新开始"
          >
            <RotateCcw size={16} strokeWidth={2.5} color="#1A1A1A" />
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="flex-1 h-10 rounded-full flex items-center justify-center gap-1.5"
            style={{
              ...nbButtonBase,
              background: '#1A1A1A',
              color: '#FFFFFF',
              fontSize: '0.82rem',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget;
              b.style.transform = 'translate(-1px,-1px)';
              b.style.boxShadow = '3px 3px 0 #7A51EC';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget;
              b.style.transform = 'none';
              b.style.boxShadow = 'none';
            }}
            title="放进画廊"
          >
            <ImagePlus size={15} strokeWidth={2.5} color="#FFFFFF" />
            <span>放进画廊</span>
          </button>
        )}
      </div>
    </div>
  );
}
