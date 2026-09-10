/** Shared by browser workers, study protocol and server validation. */
export const STROKE_CONFIG = {
  version: 'residual-capsule-2-detail',
  defaultBudget: 1000,
  maxBudget: 1000,
  analysisSize: 256,
  comparisonSize: 128,
  experienceOpacity: 0.85,
  studyOpacity: 1,
} as const;
export interface PlanningProgress { completed: number; total: number; strokes: number }
