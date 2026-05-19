'use client';

interface VisualScheduleProps {
  currentStep: number;
  totalSteps: number;
  calmMode?: boolean;
}

export default function VisualSchedule({ currentStep, totalSteps, calmMode }: VisualScheduleProps) {
  // 限制显示的步骤数（避免太长）
  const displaySteps = Math.min(totalSteps, 20);
  const stepSize = totalSteps / displaySteps;
  const currentDisplay = Math.min(displaySteps, Math.ceil(currentStep / stepSize));
  const remaining = totalSteps - currentStep;

  return (
    <div className="flex flex-col items-center gap-1 py-4 px-2 select-none" style={{ minWidth: 48 }}>
      {/* 标题 */}
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: calmMode ? '#666' : '#888', writingMode: 'vertical-rl', marginBottom: 4 }}>
        进度
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
                background: isDone
                  ? (calmMode ? '#7BA7CC' : '#7DC353')
                  : isCurrent
                    ? (calmMode ? '#5A8BA8' : '#7A51EC')
                    : '#E5E5E5',
                boxShadow: isCurrent ? `0 0 6px ${calmMode ? '#7BA7CC' : '#7A51EC'}` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* 剩余数字 */}
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 800,
        color: calmMode ? '#666' : '#1A1A1A',
        marginTop: 6,
      }}>
        {remaining > 0 ? `剩${remaining}` : '✓'}
      </span>
    </div>
  );
}
