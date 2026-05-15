'use client';

interface ToolBarProps {
  brushWidth: number;
  onBrushWidthChange: (w: number) => void;
  guideSubMode: 'assist' | 'real';
  onGuideSubModeChange: (m: 'assist' | 'real') => void;
  autoSpeed: number;
  onAutoSpeedChange: (s: number) => void;
  showSubMode?: boolean;
  showSpeed?: boolean;
  onReset?: () => void;
  onSkip?: () => void;
  onBatchDraw?: (count: number) => void;
  onExport?: () => void;
  totalStrokes?: number;
  currentStrokeIdx?: number;
}

const labelStyle = {
  fontSize: '0.7rem',
  color: 'rgba(237,233,254,0.4)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  fontWeight: 600,
};

const sectionDivider = {
  height: 1,
  background: 'var(--color-border-subtle)',
  margin: '2px 0',
};

export default function ToolBar({
  brushWidth,
  onBrushWidthChange,
  guideSubMode,
  onGuideSubModeChange,
  autoSpeed,
  onAutoSpeedChange,
  showSubMode = false,
  showSpeed = false,
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
          <label style={labelStyle}>笔刷大小</label>
          <span className="text-xs" style={{ color: 'rgba(237,233,254,0.5)' }}>{brushWidth}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={brushWidth}
          onChange={e => onBrushWidthChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none"
          style={{ accentColor: '#7C3AED', background: 'rgba(255,255,255,0.1)' }}
        />
      </div>

      {/* 跟画子模式 */}
      {showSubMode && (
        <>
          <div style={sectionDivider} />
          <div>
            <label style={{ ...labelStyle, display: 'block', marginBottom: '0.5rem' }}>跟画模式</label>
            <div className="flex gap-1 p-0.5 rounded-full" style={{ background: 'var(--color-surface)' }}>
              {(['assist', 'real'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => onGuideSubModeChange(m)}
                  className="flex-1 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: guideSubMode === m ? '#7C3AED' : 'transparent',
                    color: guideSubMode === m ? 'white' : 'rgba(237,233,254,0.5)',
                  }}
                >
                  {m === 'assist' ? '辅助' : '真实'}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: 'rgba(237,233,254,0.3)' }}>
              {guideSubMode === 'assist' ? 'AI 笔触替换你的画迹' : '保留你的原始笔迹'}
            </p>
          </div>
        </>
      )}

      {/* 播放速度 */}
      {showSpeed && (
        <>
          <div style={sectionDivider} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={labelStyle}>播放速度</label>
              <span className="text-xs" style={{ color: 'rgba(237,233,254,0.5)' }}>{autoSpeed}ms/笔</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="10"
              value={autoSpeed}
              onChange={e => onAutoSpeedChange(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none"
              style={{ accentColor: '#00FFA5', background: 'rgba(255,255,255,0.1)' }}
            />
          </div>
        </>
      )}

      {/* AI 批量绘制 */}
      {onBatchDraw && (
        <>
          <div style={sectionDivider} />
          <div>
            <label style={{ ...labelStyle, display: 'block', marginBottom: '0.5rem' }}>AI 帮你画</label>
            <div className="grid grid-cols-3 gap-1.5 mb-1.5">
              {[10, 30, 50].map(n => (
                <button
                  key={n}
                  onClick={() => onBatchDraw(n)}
                  className="py-1.5 text-xs font-medium rounded-full transition-colors"
                  style={{
                    background: 'rgba(0,255,165,0.1)',
                    color: '#00FFA5',
                    border: '1px solid rgba(0,255,165,0.2)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,165,0.2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,165,0.1)'; }}
                >
                  +{n}笔
                </button>
              ))}
            </div>
            <button
              onClick={() => onBatchDraw(totalStrokes - currentStrokeIdx)}
              className="w-full py-1.5 text-xs font-medium rounded-full transition-colors"
              style={{
                background: 'rgba(16,185,129,0.12)',
                color: '#10B981',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.22)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.12)'; }}
            >
              全部画完（剩 {totalStrokes - currentStrokeIdx} 笔）
            </button>
          </div>
        </>
      )}

      {/* 操作按钮 */}
      <div style={sectionDivider} />
      <div className="flex flex-wrap gap-1.5">
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.12)'; }}
          >
            跳过此笔
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; }}
          >
            重置画布
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.12)'; }}
          >
            保存作品
          </button>
        )}
      </div>
    </div>
  );
}
