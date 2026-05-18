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
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1A1A1A' }}>{brushWidth}px</span>
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

      {/* 播放速度 */}
      {showSpeed && (
        <>
          <div style={divider} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={labelStyle}>播放速度</label>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1A1A1A' }}>{autoSpeed}ms/笔</span>
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
            <label style={{ ...labelStyle, display: 'block', marginBottom: '0.5rem' }}>AI 帮你画</label>
            <div className="grid grid-cols-3 gap-1.5 mb-1.5">
              {[10, 30, 50].map(n => (
                <button
                  key={n}
                  onClick={() => onBatchDraw(n)}
                  className="py-1.5 text-xs font-bold rounded-full transition-colors"
                  style={{ background: '#F5F5F5', color: '#1A1A1A', border: '1.5px solid #1A1A1A' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9B801'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5'; }}
                >
                  +{n}笔
                </button>
              ))}
            </div>
            <button
              onClick={() => onBatchDraw(totalStrokes - currentStrokeIdx)}
              className="w-full py-1.5 text-xs font-bold rounded-full transition-colors"
              style={{ background: '#7DC353', color: '#1A1A1A', border: '1.5px solid #1A1A1A' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#6BB845'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#7DC353'; }}
            >
              全部画完（剩 {totalStrokes - currentStrokeIdx} 笔）
            </button>
          </div>
        </>
      )}

      {/* 操作按钮 */}
      <div style={divider} />
      <div className="flex flex-wrap gap-1.5">
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
            style={{ background: '#FFF8E0', color: '#1A1A1A', border: '1.5px solid #F9B801' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9B801'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFF8E0'; }}
          >
            跳过此笔
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
            style={{ background: '#FFF0F0', color: '#F302C9', border: '1.5px solid #F302C9' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F302C9'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFF0F0'; (e.currentTarget as HTMLButtonElement).style.color = '#F302C9'; }}
          >
            重置画布
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
            style={{ background: '#1A1A1A', color: '#FFFFFF', border: '1.5px solid #1A1A1A' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#333333'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A'; }}
          >
            保存作品
          </button>
        )}
      </div>
    </div>
  );
}
