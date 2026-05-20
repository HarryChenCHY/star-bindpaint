'use client';

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
  fontWeight: 700,
};

const divider = { height: 1, background: '#E5E5E5', margin: '2px 0' };

export default function ToolBar({
  brushWidth,
  onBrushWidthChange,
  guideSubMode,
  onGuideSubModeChange,
  autoSpeed,
  onAutoSpeedChange,
  fillMode = 'companion',
  onFillModeChange,
  autoFillRatio = 20,
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
          <label style={labelStyle}>🖌️ 粗细</label>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1A1A1A' }}>{brushWidth}</span>
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
            <label style={{ ...labelStyle, display: 'block', marginBottom: '0.5rem' }}>跟画模式</label>
            <div className="flex gap-1 p-1 rounded-full" style={{ background: '#F5F5F5', border: '1.5px solid #1A1A1A' }}>
              {(['assist', 'real'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => onGuideSubModeChange(m)}
                  className="flex-1 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: guideSubMode === m ? '#F9B801' : 'transparent',
                    color: guideSubMode === m ? '#1A1A1A' : '#888888',
                  }}
                >
                  {m === 'assist' ? '辅助' : '真实'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.65rem', marginTop: '0.4rem', color: '#AAAAAA', fontWeight: 600 }}>
              {guideSubMode === 'assist' ? 'AI 笔触替换你的画迹' : '保留你的原始笔迹'}
            </p>
          </div>
        </>
      )}

      {/* 绘画节奏（陪画/精确） */}
      {showFillMode && onFillModeChange && (
        <>
          <div style={divider} />
          <div>
            <label style={labelStyle}>🎵 节奏</label>
            <div className="flex gap-1 mt-2 p-0.5 rounded-xl" style={{ background: '#F5F5F5' }}>
              <button
                onClick={() => onFillModeChange('companion')}
                className="flex-1 px-2 py-2 rounded-lg text-center transition-all"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: fillMode === 'companion' ? '#1A1A1A' : 'transparent',
                  color: fillMode === 'companion' ? '#FFF' : '#888',
                }}
              >
                ⭐ 一起画
              </button>
              <button
                onClick={() => onFillModeChange('precise')}
                className="flex-1 px-2 py-2 rounded-lg text-center transition-all"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: fillMode === 'precise' ? '#1A1A1A' : 'transparent',
                  color: fillMode === 'precise' ? '#FFF' : '#888',
                }}
              >
                ✏️ 自己画
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#AAA', fontWeight: 600, marginTop: 4 }}>
              {fillMode === 'companion'
                ? `你画1笔 → Starry帮画${autoFillRatio}笔`
                : '每一笔都由你来画'}
            </p>
            {fillMode === 'companion' && onAutoFillRatioChange && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>Starry 帮多少</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1A1A1A' }}>1:{autoFillRatio}</span>
                </div>
                <input
                  type="range" min="20" max="200" step="10" value={autoFillRatio}
                  onChange={e => onAutoFillRatioChange(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none"
                  style={{ background: '#E5E5E5', accentColor: '#7A51EC' }}
                />
                <div className="flex justify-between">
                  <span style={{ fontSize: '0.6rem', color: '#BBB', fontWeight: 600 }}>🐢 少一点</span>
                  <span style={{ fontSize: '0.6rem', color: '#BBB', fontWeight: 600 }}>🐇 多一点</span>
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
              <label style={labelStyle}>⏩ 快慢</label>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1A1A1A' }}>{autoSpeed === 0 ? '最快' : `${autoSpeed}ms`}</span>
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
            <label style={{ ...labelStyle, display: 'block', marginBottom: '0.5rem' }}>⭐ Starry 帮画</label>
            <div className="grid grid-cols-3 gap-1.5 mb-1.5">
              {[10, 30, 50].map(n => (
                <button
                  key={n}
                  onClick={() => onBatchDraw(n)}
                  className="py-2 text-sm font-bold rounded-full transition-colors"
                  style={{ background: '#F5F5F5', color: '#1A1A1A', border: '1.5px solid #1A1A1A' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9B801'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5'; }}
                >
                  +{n}
                </button>
              ))}
            </div>
            <button
              onClick={() => onBatchDraw(totalStrokes - currentStrokeIdx)}
              className="w-full py-2 text-sm font-bold rounded-full transition-colors flex items-center justify-center gap-1.5"
              style={{ background: '#7DC353', color: '#1A1A1A', border: '1.5px solid #1A1A1A' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#6BB845'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#7DC353'; }}
            >
              <span>🎨</span> 全部画完
            </button>
          </div>
        </>
      )}

      {/* 操作按钮 — 图标化 */}
      <div style={divider} />
      <div className="flex flex-wrap gap-2">
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ background: '#FFF8E0', border: '2px solid #F9B801' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9B801'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFF8E0'; }}
            title="换一笔"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {onReset && (
          <button
            onClick={() => { if (confirm('重新开始？')) onReset(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ background: '#FFF0F0', border: '2px solid #F302C9' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F302C9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFF0F0'; }}
            title="重新开始"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6M23 20v-6h-6" stroke="#F302C9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="#F302C9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="flex-1 h-10 rounded-full flex items-center justify-center gap-2 transition-colors"
            style={{ background: '#1A1A1A', border: '2px solid #1A1A1A' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#333333'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A'; }}
            title="放进画廊"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
              <path d="M21 15l-5-5L5 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>放进画廊</span>
          </button>
        )}
      </div>
    </div>
  );
}
