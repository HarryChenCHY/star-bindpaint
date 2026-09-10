import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandoff } from '../../src/lib/study/server/handoff';
import { config } from '../../src/lib/study/server/service';
import { hash, StudyRepository } from '../../src/lib/study/server/repository';
test('handoff preserves stored material, verifies hashes and never publishes a draft', () => {
  const dir = mkdtempSync(join(tmpdir(), 'startrace-handoff-')), repo = new StudyRepository(dir);
  try {
    const c = config(repo);
    assert.throws(() => createHandoff(repo, c.id), /先保存/);
    const png = Buffer.from('synthetic-png-fixture');
    c.material = 'data:image/png;base64,' + png.toString('base64'); c.materialHash = hash(png);
    c.plan = { version: 'historical-test-plan', width: 4, height: 4, strokes: [], quality: { coverage: 0, regions: 0, simplified: false, notes: [] } };
    c.planHash = hash(JSON.stringify(c.plan)); repo.put('config', c.id, c);
    const first = createHandoff(repo, c.id), second = createHandoff(repo, c.id);
    assert.notEqual(first.id, second.id);
    const bytes = repo.read(first.path), bundle = JSON.parse(bytes.toString());
    assert.equal(hash(bytes), first.sha256);
    assert.equal(bundle.status, 'draft');
    assert.equal(config(repo).published, false);
    assert.equal(bundle.materialAlgorithmVersion, 'historical-test-plan');
    assert.deepEqual(bundle.material.plan, c.plan);
    assert.equal('participants' in bundle, false);
    assert.equal(bundle.manifest.protocolHash, hash(JSON.stringify(bundle.protocol)));
    c.published = true; c.materialReviewed = true; repo.put('config', c.id, c);
    assert.equal(createHandoff(repo, c.id).status, 'published-pilot');
    c.protocolVersion = 'old-protocol'; repo.put('config', c.id, c);
    assert.equal(createHandoff(repo, c.id).status, 'draft');
    c.planHash = 'bad'; repo.put('config', c.id, c);
    assert.throws(() => createHandoff(repo, c.id), /哈希不一致/);
  } finally { repo.db.close(); rmSync(dir, { recursive: true, force: true }); }
});
