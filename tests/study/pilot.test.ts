import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudyRepository } from '../../src/lib/study/server/repository';
import { config } from '../../src/lib/study/server/service';
import { pilotSnapshot, savePilotIssue, savePilotReview } from '../../src/lib/study/server/pilot';
import type { Participant, Session } from '../../src/lib/study/types';
test('pilot readiness requires complete paired work, both ratings, current review and no blockers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'startrace-pilot-')), repo = new StudyRepository(dir);
  try {
    const c = config(repo); c.planHash = 'plan-v2'; c.materialReviewed = true; repo.put('config', c.id, c);
    assert.equal(pilotSnapshot(repo).ready, false);
    for (let n = 1; n <= 6; n++) {
      const p: Participant = { id: `T00${n}`, pairId: `p${n}`, studyId: c.id, order: 'AB', tokenHash: 'test', createdAt: '2026-09-10', consentVersion: 'test', researchLogConsent: true, researchArtworkConsent: true, eligible: true, practiceAt: 'now', interview: [], withdrawnAt: null };
      repo.put('participant', p.pairId, p);
      for (const condition of ['control', 'guided'] as const) {
        const s: Session = { id: `${p.pairId}-${condition}`, participantId: p.id, pairId: p.pairId, studyId: c.id, period: condition === 'control' ? 1 : 2, condition, attempt: 1, supersedes: null, state: 'timeout', pageId: null, startedAt: 'now', endedAt: 'now', finalizedAt: 'now', pre: {}, post: {}, events: [], artifact: null, artifactHash: null, rawHash: null, ratings: ['rater1', 'rater2'].map(rater => ({ rater, scores: [], revision: 1, at: 'now', reason: '' })), quality: [], inclusion: 'pending', inclusionReason: '' };
        repo.put('session', s.id, s);
      }
    }
    assert.equal(pilotSnapshot(repo).complete, 6);
    assert.equal(pilotSnapshot(repo).ready, false);
    const review = savePilotReview(repo, { revision: 0, planHash: c.planHash, checks: { device: true, workload: true, rating: true, storage: true }, note: 'synthetic test only' });
    assert.equal(pilotSnapshot(repo).ready, true);
    assert.throws(() => savePilotReview(repo, { ...review, revision: 0 }), /已更新/);
    const issue = savePilotIssue(repo, { revision: 0, title: 'synthetic input failure', severity: 'blocking', status: 'open', resolution: '' });
    assert.equal(pilotSnapshot(repo).ready, false);
    assert.throws(() => savePilotIssue(repo, { ...issue, status: 'resolved' }), /必须填写/);
    savePilotIssue(repo, { ...issue, status: 'resolved', resolution: 'synthetic fix verified' });
    assert.equal(pilotSnapshot(repo).ready, true);
    assert.throws(() => savePilotIssue(repo, { ...issue, status: 'open' }), /已更新/);
    const s = repo.get<Session>('session', 'p1-guided')!; s.ratings.pop(); repo.put('session', s.id, s);
    assert.equal(pilotSnapshot(repo).rated, 5);
    assert.equal(pilotSnapshot(repo).ready, false);
    const p = repo.get<Participant>('participant', 'p2')!; p.withdrawnAt = 'now'; repo.put('participant', p.pairId, p);
    assert.equal(pilotSnapshot(repo).complete, 5);
    c.planHash = 'new-material'; repo.put('config', c.id, c);
    assert.equal(pilotSnapshot(repo).reviewCurrent, false);
    assert.ok(repo.auditFor(c.id).length >= 3);
  } finally { repo.db.close(); rmSync(dir, { recursive: true, force: true }); }
});
