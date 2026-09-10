import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config, enroll, report } from '../../src/lib/study/server/service';
import { StudyRepository } from '../../src/lib/study/server/repository';

test('自定义研究码全局去重、重开保留，并进入配对报告', () => {
  const dir = mkdtempSync(join(tmpdir(), 'startrace-code-'));
  let repo = new StudyRepository(dir);
  try {
    const c = config(repo);
    c.published = true; c.material = 'fixture';
    c.plan = { version: 'fixture', width: 4, height: 4, strokes: [], quality: { coverage: 0, regions: 0, simplified: false, notes: [] } };
    repo.put('config', c.id, c);
    const p = enroll(repo, c.id, ' 测试-Alpha_1 ').participant;
    assert.equal(p.researchCode, '测试-Alpha_1');
    assert.equal(report(repo, c.id).pairs[0].researchCode, p.researchCode);
    assert.throws(() => enroll(repo, c.id, '测试-alpha_1'), /已存在/);
    assert.throws(() => enroll(repo, 'novice-formal-v1', '测试-Ａlpha_1'), /已存在/);
    for (const code of ['', '../escape', 'a/b', 'x'.repeat(65)])
      assert.throws(() => enroll(repo, c.id, code), /研究码请使用/);
    assert.equal(repo.all('participant').length, 1);
    repo.db.close(); repo = new StudyRepository(dir);
    assert.throws(() => enroll(repo, c.id, '测试-Alpha_1'), /已存在/);
    assert.equal(enroll(repo, c.id, '新测试').participant.researchCode, '新测试');
  } finally { repo.db.close(); rmSync(dir, { recursive: true, force: true }); }
});
