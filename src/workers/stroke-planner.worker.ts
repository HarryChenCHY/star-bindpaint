import {
  planBudgetStrokes,
  BUDGET_ENGINE_VERSION,
} from '../lib/budget-strokes';
import type { StrokePlan } from '../lib/study/protocol';
import { STROKE_CONFIG } from '../lib/stroke-config';
self.onmessage = async (e: MessageEvent) => {
  try {
    const source = e.data.source;
    // StudyCanvas uses opaque paint; fit against that renderer, not the .85 experience brush.
    const strokes = await planBudgetStrokes(
      source,
      source.width,
      source.height,
      e.data.budget ?? STROKE_CONFIG.defaultBudget,
      2,
      STROKE_CONFIG.studyOpacity,
      (progress) => self.postMessage({ type: 'progress', progress }),
    );
    const plan: StrokePlan = {
      version: BUDGET_ENGINE_VERSION + '-opaque',
      width: source.width,
      height: source.height,
      strokes: strokes.map((s, i) => ({
        ...s,
        id: `paint-${i + 1}`,
        phase: 'paint',
        regionId: i,
        color:
          '#' +
          s.color
            .map((c) =>
              Math.round(c * 255)
                .toString(16)
                .padStart(2, '0'),
            )
            .join(''),
      })),
      quality: {
        coverage: 0,
        regions: 0,
        simplified: false,
        notes: [
          '直接拟合原图，按顺序绘画，无独立轮廓阶段。',
          'coverage 未计算，不代表完成度；1000 笔不能保留所有照片细节。',
        ],
      },
    };
    self.postMessage({ ok: true, plan, simplified: source });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : '规划失败',
    });
  }
};
