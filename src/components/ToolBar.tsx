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
        <label className="text-xs text-[#94A3B8] block mb-1">笔刷大小</label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={brushWidth}
          onChange={e => onBrushWidthChange(Number(e.target.value))}
          className="w-full accent-[#7C3AED] h-2 rounded-full appearance-none bg-white/10"
        />
        <span className="text-xs text-white/60">{brushWidth}px</span>
      </div>

      {/* 辅助/真实模式切换 */}
      {showSubMode && (
        <div>
          <label className="text-xs text-[#94A3B8] block mb-1">跟画模式</label>
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => onGuideSubModeChange('assist')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                guideSubMode === 'assist' ? 'bg-[#7C3AED] text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              辅助
            </button>
            <button
              onClick={() => onGuideSubModeChange('real')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                guideSubMode === 'real' ? 'bg-[#7C3AED] text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              真实
            </button>
          </div>
          <p className="text-[10px] text-white/40 mt-1">
            {guideSubMode === 'assist' ? '用AI笔触替换你的画' : '保留你的原始笔迹'}
          </p>
        </div>
      )}

      {/* 播放速度 */}
      {showSpeed && (
        <div>
          <label className="text-xs text-[#94A3B8] block mb-1">播放速度</label>
          <input
            type="range"
            min="0"
            max="200"
            step="10"
            value={autoSpeed}
            onChange={e => onAutoSpeedChange(Number(e.target.value))}
            className="w-full accent-[#06B6D4] h-2 rounded-full appearance-none bg-white/10"
          />
          <span className="text-xs text-white/60">{autoSpeed}ms/笔</span>
        </div>
      )}

      {/* 批量绘制按钮（跟画模式） */}
      {onBatchDraw && (
        <div>
          <label className="text-xs text-[#94A3B8] block mb-2">AI 帮你画</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[10, 30, 50].map(n => (
              <button
                key={n}
                onClick={() => onBatchDraw(n)}
                className="px-2 py-1.5 rounded-lg bg-[#06B6D4]/15 text-[#67E8F9] text-xs font-medium hover:bg-[#06B6D4]/25 transition-colors"
              >
                +{n}笔
              </button>
            ))}
          </div>
          <button
            onClick={() => onBatchDraw(totalStrokes - currentStrokeIdx)}
            className="mt-1.5 w-full px-2 py-1.5 rounded-lg bg-[#10B981]/15 text-[#6EE7B7] text-xs font-medium hover:bg-[#10B981]/25 transition-colors"
          >
            全部自动画完（剩余 {totalStrokes - currentStrokeIdx} 笔）
          </button>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2 mt-2">
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-3 py-1.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] text-xs font-medium hover:bg-[#F59E0B]/30 transition-colors"
          >
            跳过此笔
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-full bg-[#EF4444]/20 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/30 transition-colors"
          >
            重置画布
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="px-3 py-1.5 rounded-full bg-[#10B981]/20 text-[#10B981] text-xs font-medium hover:bg-[#10B981]/30 transition-colors"
          >
            保存作品
          </button>
        )}
      </div>
    </div>
  );
}
