'use client';

interface VisualScheduleProps {
  currentStep: number;
  totalSteps: number;
}

export default function VisualSchedule({ currentStep, totalSteps }: VisualScheduleProps) {
  // 限制显示的步骤数（避免太长）
  const displaySteps = Math.min(totalSteps, 20);
  const stepSize = totalSteps / displaySteps;
  const currentDisplay = Math.min(displaySteps, Math.ceil(currentStep / stepSize));
  const remaining = totalSteps - currentStep;

  return (
    <div className="flex flex-col items-center gap-1 py-4 px-2 select-none" style={{ minWidth: 48 }}>
      {/* 星迹进度 */}
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#888', writingMode: 'vertical-rl', marginBottom: 4 }}>
        星迹进度
      </span>

      {/* 步骤点 */}
      <div className="flex flex-col gap-1 items-center">
        {Array.from({ length: displaySteps }, (_, i) => {
          const isDone = i < currentDisplay;
          const isCurrent = i === currentDisplay;
          return (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: isCurrent ? 10 : 6,
                height: isCurrent ? 10 : 6,
                background: isDone ? '#6558D9' : isCurrent ? '#FFD166' : '#E5E5E5',
                border: isCurrent ? '1.5px solid #17233F' : 'none',
                boxShadow: isCurrent ? '0 0 8px #FFD166' : 'none',
              }}
            />
          );
        })}
      </div>

      {/* 剩余数字 */}
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 800,
        color: '#1A1A1A',
        marginTop: 6,
      }}>
        {remaining > 0 ? `剩${remaining}` : '✓'}
      </span>
    </div>
  );
}
