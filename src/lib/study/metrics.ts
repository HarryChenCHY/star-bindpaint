import { PROTOCOL } from './protocol';
import type { Session, SessionMetrics } from './types';
type Interval = [number, number];
export function union(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const [a, b] of [...intervals]
    .filter(([a, b]) => Number.isFinite(a + b) && b >= a)
    .sort((a, b) => a[0] - b[0])) {
    const last = result[result.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(b, last[1]);
    else result.push([a, b]);
  }
  return result;
}
const duration = (is: Interval[]) =>
  union(is).reduce((s, [a, b]) => s + b - a, 0);
export function metrics(s: Session, essential = [0, 3]): SessionMetrics {
  const events = s.events,
    end = events.find((e) => e.type === 'task_ended')?.offsetMs ?? null;
  const observed = end ?? events.at(-1)?.offsetMs ?? 0;
  const intervals = (type: string) => {
    let open: number | null = null;
    const result: Interval[] = [];
    for (const e of events) {
      if (e.type === `${type}_started` && open === null) open = e.offsetMs;
      if (e.type === `${type}_ended` && open !== null) {
        result.push([open, e.offsetMs]);
        open = null;
      }
    }
    if (open !== null) result.push([open, observed]);
    return result;
  };
  const hidden = intervals('hidden'),
    breaks = intervals('break'),
    blocked = intervals('system_block');
  const unavailable = union([...hidden, ...breaks, ...blocked]);
  const valid = events.filter(
    (e) =>
      e.type === 'stroke_ended' &&
      e.payload.valid === true &&
      e.payload.tool !== 'eraser',
  );
  const drawn: Interval[] = valid.map((e) => [
    Number(e.payload.startedMs),
    e.offsetMs,
  ]);
  const gaps: Interval[] = [];
  for (let i = 1; i < drawn.length; i++) {
    const a = drawn[i - 1][1],
      b = drawn[i][0];
    if (
      b - a >= PROTOCOL.idleThresholdMs &&
      !unavailable.some(([x, y]) => x < b && y > a)
    )
      gaps.push([a, b]);
  }
  const latest = new Map(s.ratings.map((r) => [r.rater, r]));
  const ratings = [...latest.values()];
  const completion =
    ratings.length === 2
      ? ratings.reduce(
          (a, r) => a + r.scores.reduce((x, y) => x + y, 0) * 5,
          0,
        ) / 2
      : null;
  const qualified =
    completion === null
      ? null
      : completion >= PROTOCOL.qualificationScore &&
        ratings.every((r) => essential.every((i) => r.scores[i] >= 1));
  const observableMs = Math.max(0, observed - duration(unavailable));
  return {
    elapsedMs: end,
    drawingMs: duration(drawn),
    firstMarkMs: drawn[0]?.[0] ?? null,
    attempts: events.filter((e) => e.type === 'stroke_started').length,
    validStrokes: valid.length,
    cancellations: events.filter((e) => e.type === 'stroke_cancelled').length,
    eraserCount: events.filter(
      (e) => e.type === 'stroke_ended' && e.payload.tool === 'eraser',
    ).length,
    idleCount: gaps.length,
    idleMs: duration(gaps),
    terminalGapMs: drawn.length && end !== null ? end - drawn.at(-1)![1] : null,
    hiddenMs: duration(hidden),
    breakMs: duration(breaks),
    blockedMs: duration(blocked),
    unavailableMs: duration(unavailable),
    observableMs,
    idlePerMinute:
      observableMs > 0 ? (gaps.length * 60000) / observableMs : null,
    undoCount: events.filter((e) => e.type === 'undo').length,
    matched:
      s.condition === 'guided'
        ? new Set(
            events
              .filter(
                (e) =>
                  e.type === 'guide_evaluated' && e.payload.matched === true,
              )
              .map((e) => e.payload.planStrokeId),
          ).size
        : null,
    advanced:
      s.condition === 'guided'
        ? new Set(
            events
              .filter((e) =>
                ['guide_advanced', 'guide_skipped'].includes(e.type),
              )
              .map((e) => e.payload.planStrokeId),
          ).size
        : null,
    completion,
    qualified,
    qualifiedTimeMs: s.state === 'submitted' && qualified ? end : null,
  };
}
export const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
export function exactSign(diffs: number[]) {
  const positive = diffs.filter((d) => d > 0).length,
    negative = diffs.filter((d) => d < 0).length;
  const n = positive + negative,
    k = Math.min(positive, negative);
  let term = 2 ** -n,
    sum = term;
  for (let i = 1; i <= k; i++) {
    term *= (n - i + 1) / i;
    sum += term;
  }
  const cdf = (k: number, p: number) => {
    if (p === 0) return 1;
    if (p === 1) return k >= n ? 1 : 0;
    let term = (1 - p) ** n,
      total = term;
    for (let i = 1; i <= k; i++) {
      term *= (((n - i + 1) / i) * p) / (1 - p);
      total += term;
    }
    return total;
  };
  const solve = (k: number, target: number) => {
    let low = 0,
      high = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (cdf(k, mid) > target) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  };
  const positiveFractionCI = n
    ? [
        positive === 0 ? 0 : solve(positive - 1, 0.975),
        positive === n ? 1 : solve(positive, 0.025),
      ]
    : null;
  return {
    n: diffs.length,
    nonTies: n,
    positive,
    negative,
    ties: diffs.length - n,
    meanDifference: mean(diffs),
    positiveFractionCI,
    p: n ? Math.min(1, 2 * sum) : null,
  };
}
export function holm(ps: (number | null)[]) {
  const result: (number | null)[] = ps.map(() => null);
  const order = ps
    .flatMap((p, i) => (p === null ? [] : [{ p, i }]))
    .sort((a, b) => a.p - b.p);
  let previous = 0;
  order.forEach((x, rank) => {
    previous = Math.max(previous, Math.min(1, x.p * (ps.length - rank)));
    result[x.i] = previous;
  });
  return result;
}
