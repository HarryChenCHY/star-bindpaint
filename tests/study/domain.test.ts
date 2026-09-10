import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudyRepository, hash } from '../../src/lib/study/server/repository';
import {
  appendEvents,
  config,
  createSession,
  enroll,
  finish,
} from '../../src/lib/study/server/service';
import { metrics, union, exactSign, holm } from '../../src/lib/study/metrics';
import {
  assertAnswers,
  PROTOCOL,
  type StudyEvent,
} from '../../src/lib/study/protocol';
import { planSimplifiedImage } from '../../src/lib/stroke-planner';
import type { Participant, Session } from '../../src/lib/study/types';
const root = () => mkdtempSync(join(tmpdir(), 'startrace-test-'));
const event = (
  seq: number,
  type: string,
  offsetMs: number,
  payload: StudyEvent['payload'] = {},
): StudyEvent => ({
  seq,
  type,
  offsetMs,
  clientAt: '2026-09-10T00:00:00.000Z',
  payload,
});
function fixture(repo: StudyRepository) {
  const c = config(repo);
  c.published = true;
  c.material = 'fixture';
  c.plan = {
    version: 'fixture',
    width: 10,
    height: 10,
    strokes: [],
    quality: { coverage: 0, regions: 0, simplified: true, notes: [] },
  };
  repo.put('config', c.id, c);
  const { participant: p } = enroll(repo, c.id);
  p.practiceAt = new Date().toISOString();
  repo.put('participant', p.pairId, p);
  const s = createSession(repo, p, 1);
  s.startedAt = '2026-09-10T00:00:00.000Z';
  s.state = 'running';
  return { p, s };
}
test('randomized block persists balanced AB/BA and reopening does not lose confirmed data', () => {
  const dir = root();
  let repo = new StudyRepository(dir);
  try {
    const { p, s } = fixture(repo);
    for (let i = 0; i < 3; i++) enroll(repo, p.studyId);
    const people = repo.all<Participant>('participant');
    assert.equal(people.filter((p) => p.order === 'AB').length, 2);
    assert.equal(people.filter((p) => p.order === 'BA').length, 2);
    repo.put('session', s.id, s);
    repo.db.close();
    repo = new StudyRepository(dir);
    assert.deepEqual(repo.get('session', s.id), s);
  } finally {
    repo.db.close();
    rmSync(dir, { recursive: true });
  }
});
test('event replay is idempotent, holes/conflicts and post-terminal inputs are rejected', () => {
  const dir = root(),
    repo = new StudyRepository(dir);
  try {
    const { s } = fixture(repo);
    const e = event(1, 'task_started', 0);
    appendEvents(s, [e]);
    appendEvents(s, [e]);
    assert.equal(s.events.length, 1);
    assert.throws(() => appendEvents(s, [event(3, 'undo', 100)]), /缺口/);
    assert.throws(() => appendEvents(s, [event(1, 'task_started', 1)]), /冲突/);
    appendEvents(s, [event(2, 'task_ended', 100, { reason: 'submitted' })]);
    assert.throws(() => appendEvents(s, [event(3, 'undo', 101)]), /终止/);
    assert.throws(() => finish(repo, s), /作品/);
  } finally {
    repo.db.close();
    rmSync(dir, { recursive: true });
  }
});
test('union-based metrics exclude overlapping hidden and break gaps; failed guidance is still drawing', () => {
  const s = {
    events: [
      event(1, 'task_started', 0),
      event(2, 'stroke_started', 1000, { strokeId: 's1' }),
      event(3, 'stroke_ended', 3000, {
        valid: true,
        startedMs: 1000,
        tool: 'brush',
      }),
      event(4, 'hidden_started', 5000),
      event(5, 'break_started', 6000),
      event(6, 'hidden_ended', 10000),
      event(7, 'break_ended', 12000),
      event(8, 'stroke_ended', 17000, {
        valid: true,
        startedMs: 15000,
        tool: 'brush',
      }),
      event(9, 'guide_evaluated', 17000, { matched: false }),
      event(10, 'stroke_ended', 27000, {
        valid: true,
        startedMs: 25000,
        tool: 'brush',
      }),
      event(11, 'task_ended', 30000, { reason: 'submitted' }),
    ],
    ratings: [],
    condition: 'guided',
    state: 'submitted',
  } as unknown as Session;
  const m = metrics(s);
  assert.equal(m.unavailableMs, 7000);
  assert.equal(m.drawingMs, 6000);
  assert.equal(m.idleCount, 1);
  assert.equal(m.idleMs, 8000);
  assert.equal(m.firstMarkMs, 1000);
  assert.equal(m.terminalGapMs, 3000);
  assert.equal(m.completion, null);
  assert.equal(m.qualifiedTimeMs, null);
  assert.equal(m.matched, 0);
  assert.equal(m.validStrokes, 3);
  assert.deepEqual(
    union([
      [3, 5],
      [0, 4],
      [6, 7],
    ]),
    [
      [0, 5],
      [6, 7],
    ],
  );
});
test('null answers stay null, invalid zero and omitted fields rejected', () => {
  const a = { willingness: null, concern: 1 };
  assertAnswers(a, false);
  assert.equal(a.willingness, null);
  assert.throws(() => assertAnswers({ willingness: 0, concern: 1 }, false));
  assert.throws(() => assertAnswers({ willingness: 3 }, false));
});
test('exact sign test known binomial answers and Holm preserve missingness', () => {
  assert.equal(exactSign([1, 2, 3, 4, 5]).p, 0.0625);
  assert.equal(exactSign([1, -1, 0]).p, 1);
  assert.equal(exactSign([0, 0]).p, null);
  assert.deepEqual(holm([0.01, 0.04]), [0.02, 0.04]);
  assert.deepEqual(holm([null, 0.03]), [null, 0.06]);
  assert.ok(
    Math.abs(
      exactSign([1, 2, 3, 4, 5]).positiveFractionCI![0] - 0.025 ** (1 / 5),
    ) < 1e-10,
  );
  assert.equal(exactSign([1, 2]).positiveFractionCI![1], 1);
});
test('two independent ratings determine completion; timeout is never qualified completion time', () => {
  const s = {
    events: [
      event(1, 'task_started', 0),
      event(2, 'task_ended', PROTOCOL.timeLimitMs, { reason: 'timeout' }),
    ],
    ratings: [
      { rater: 'r1', scores: Array(10).fill(2) },
      { rater: 'r2', scores: Array(10).fill(2) },
    ],
    condition: 'control',
    state: 'timeout',
  } as unknown as Session;
  const m = metrics(s);
  assert.equal(m.completion, 100);
  assert.equal(m.qualified, true);
  assert.equal(m.qualifiedTimeMs, null);
  assert.equal(m.advanced, null);
  assert.equal(m.firstMarkMs, null);
});
test('planner covers simple regions, is deterministic and caps final independent paths after splitting', () => {
  for (let n = 0; n < 12; n++) {
    const w = 80 + n * 3,
      h = 64 + n * 2,
      data = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 15; y < h - 12; y++)
      for (let x = 20; x < w - 20; x++) {
        const i = (y * w + x) * 4;
        data.set(y < h / 2 ? [80, 140, 70, 255] : [210, 130, 80, 255], i);
      }
    const source = { width: w, height: h, data },
      a = planSimplifiedImage(source),
      b = planSimplifiedImage(source);
    assert.equal(hash(JSON.stringify(a.plan)), hash(JSON.stringify(b.plan)));
    assert.ok(a.plan.strokes.length <= 180);
    assert.ok(a.plan.strokes.length > 5);
    let phase = 0;
    for (const stroke of a.plan.strokes) {
      const next = ['outline', 'large_color', 'small_color'].indexOf(
        stroke.phase,
      );
      assert.ok(next >= phase);
      phase = next;
      assert.ok(stroke.points.length >= 2);
      assert.ok(
        stroke.points.every(
          (p) => p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h,
        ),
      );
    }
    assert.ok(a.plan.strokes.some((s) => s.phase === 'outline'));
    assert.ok(a.plan.strokes.some((s) => s.phase === 'large_color'));
  }
});
