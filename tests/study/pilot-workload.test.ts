import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pilotWorkload } from '../../src/lib/study/pilot-workload';
import { freshConfig } from '../../src/lib/study/server/service';
import type { Participant, Session } from '../../src/lib/study/types';
import type { StudyEvent } from '../../src/lib/study/protocol';
const config = freshConfig('pilot');
config.plan = { version: 'test', width: 100, height: 100, strokes: ['s1', 's2'].map(id => ({ id, phase: 'paint', regionId: 1, color: '#000000', width: 2, points: [{ x: 1, y: 1 }, { x: 20, y: 20 }] })), quality: { coverage: 0, regions: 0, simplified: false, notes: [] } };
const person: Participant = { id: 'T001', pairId: 'pair', studyId: config.id, order: 'AB', tokenHash: 'test', createdAt: 'now', consentVersion: 'test', researchLogConsent: true, researchArtworkConsent: true, eligible: true, practiceAt: 'now', interview: null, withdrawnAt: null };
function session(condition: 'control' | 'guided', end = 60000): Session {
  return { id: condition, participantId: person.id, pairId: person.pairId, studyId: config.id, condition, period: condition === 'control' ? 1 : 2, attempt: 1, supersedes: null, state: 'submitted', pageId: null, startedAt: 'now', endedAt: 'now', finalizedAt: 'now', pre: null, post: null, events: [{ seq: 1, type: 'task_ended', offsetMs: end, clientAt: 'now', payload: {} }], artifact: null, artifactHash: null, rawHash: null, ratings: [], quality: [], inclusion: 'pending', inclusionReason: '' };
}
test('pilot workload preserves missingness, pairs durations and deduplicates guidance independently of completion', () => {
  const a = session('control'), b = session('guided', 120000);
  const events: StudyEvent[] = ['guide_advanced', 'guide_advanced', 'guide_skipped'].map((type, i) => ({ seq: i + 1, type, offsetMs: (i + 1) * 1000, clientAt: 'now', payload: { planStrokeId: 's1' } }));
  b.events.unshift(...events);
  const d = pilotWorkload(config, [person], [a, b]);
  assert.deepEqual(d.pairedElapsedDifferenceMs, { n: 1, median: 60000 });
  assert.equal(d.groups[1].guidanceRatio.median, .5);
  assert.equal(d.rows[0].guided?.guidance?.skipped, 1);
  assert.deepEqual(d.groups[1].completion, { n: 0, median: null });
  assert.equal(d.groups[0].validStrokes.median, 0);
  assert.equal(d.groups[0].guidanceRatio.median, null);
  assert.equal(pilotWorkload(config, [], []).groups[0].elapsedMs.median, null);
  b.events.push({ seq: 9, type: 'guide_advanced', offsetMs: 120000, clientAt: 'now', payload: { planStrokeId: 'unknown' } });
  assert.equal(pilotWorkload(config, [person], [a, b]).groups[1].guidanceRatio.n, 0);
});
test('pilot workload omits withdrawn, excluded, missing endings and unfinished latest retries from summaries', () => {
  const a = session('control'), b = session('guided');
  b.inclusion = 'exclude';
  assert.equal(pilotWorkload(config, [person], [a, b]).pairedElapsedDifferenceMs.n, 0);
  assert.equal(pilotWorkload(config, [{ ...person, withdrawnAt: 'now' }], [a]).groups[0].n, 0);
  a.events = [];
  assert.equal(pilotWorkload(config, [person], [a]).groups[0].n, 0);
  const old = session('guided');
  const retry = { ...session('guided'), id: 'retry', attempt: 2, state: 'created' as const, finalizedAt: null };
  assert.equal(pilotWorkload(config, [person], [old, retry]).groups[1].n, 0);
});
