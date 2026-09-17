import type {
  Answers,
  Condition,
  EndReason,
  StrokePlan,
  StudyEvent,
} from './protocol';
export interface StudyConfig {
  id: string;
  stage: 'pilot' | 'formal';
  published: boolean;
  materialReviewed: boolean;
  protocolVersion: string;
  material: string | null;
  plan: StrokePlan | null;
  materialHash: string;
  planHash: string;
  rubric: string[];
  essentialItems: number[];
  checks: Record<string, boolean>;
  governance: {
    researcherContact: string;
    compensation: string;
    ethicsStatement: string;
  };
  createdAt: string;
}
export interface Participant {
  researchCode?: string;
  id: string;
  pairId: string;
  studyId: string;
  order: 'AB' | 'BA';
  tokenHash: string;
  createdAt: string;
  consentVersion: string;
  consent?: {
    informationRead: true;
    voluntary: true;
    privacyUnderstood: true;
    recordedAt: string;
  };
  profile?: {
    ageBand: '18-24' | '25-34' | '35-44' | '45-plus' | 'prefer-not';
    drawingFrequency: 'never' | 'few-year' | 'monthly' | 'prefer-not';
    digitalDrawingExperience: 'never' | 'tried' | 'occasional' | 'prefer-not';
  };
  researchLogConsent: true;
  researchArtworkConsent: true;
  eligible: true;
  practiceAt: string | null;
  practiceStartedAt?: string;
  interview: string[] | null;
  interviewSource?: 'participant' | 'researcher';
  interviewRecordedAt?: string;
  withdrawnAt: string | null;
}
export interface Rating {
  rater: string;
  scores: number[];
  revision: number;
  at: string;
  reason: string;
}
export interface Session {
  id: string;
  participantId: string;
  pairId: string;
  studyId: string;
  period: number;
  condition: Condition;
  attempt: number;
  supersedes: string | null;
  state: 'created' | 'running' | EndReason;
  pageId: string | null;
  lastSeenAt?: string;
  startedAt: string | null;
  endedAt: string | null;
  finalizedAt: string | null;
  pre: Answers | null;
  post: Answers | null;
  events: StudyEvent[];
  artifact: string | null;
  artifactHash: string | null;
  rawHash: string | null;
  ratings: Rating[];
  quality: string[];
  inclusion: 'pending' | 'include' | 'exclude';
  inclusionReason: string;
}
export interface SessionMetrics {
  elapsedMs: number | null;
  drawingMs: number;
  firstMarkMs: number | null;
  lastMarkMs: number | null;
  activeSpanMs: number | null;
  activeMinutes: number;
  longestIdleMs: number;
  attempts: number;
  validStrokes: number;
  cancellations: number;
  eraserCount: number;
  idleCount: number;
  idleMs: number;
  terminalGapMs: number | null;
  hiddenMs: number;
  breakMs: number;
  blockedMs: number;
  unavailableMs: number;
  observableMs: number;
  idlePerMinute: number | null;
  undoCount: number;
  matched: number | null;
  advanced: number | null;
  completion: number | null;
  qualified: boolean | null;
  qualifiedTimeMs: number | null;
}
