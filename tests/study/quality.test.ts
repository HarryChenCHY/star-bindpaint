import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPlan } from '../../src/lib/stroke-planner/quality';
import { MATERIAL_FIXTURES } from '../../src/lib/stroke-planner/fixtures';
import type { StrokePlan } from '../../src/lib/study/protocol';
function plan(): StrokePlan {
  return {
    version: 'test',
    width: 320,
    height: 320,
    strokes: [
      {
        id: 's1',
        phase: 'outline',
        color: '#273648',
        width: 3,
        regionId: 0,
        points: [
          { x: 20, y: 20 },
          { x: 40, y: 40 },
        ],
      },
    ],
    quality: { coverage: 1, regions: 1, simplified: true, notes: [] },
  };
}
test('material catalog contains distinct subjects and three explicit groups', () => {
  assert.equal(MATERIAL_FIXTURES.length, 12);
  assert.equal(new Set(MATERIAL_FIXTURES.map((f) => f.source)).size, 12);
  assert.deepEqual(
    ['simple', 'boundary', 'complex'].map(
      (group) => MATERIAL_FIXTURES.filter((f) => f.group === group).length,
    ),
    [6, 3, 3],
  );
});
test('plan audit detects final action and ordering errors without granting human approval', () => {
  const good = inspectPlan(plan());
  assert.equal(good.passed, true);
  assert.equal(good.humanReview, 'pending');
  const broken = plan();
  broken.strokes.push({ ...broken.strokes[0], phase: 'small_color' });
  broken.strokes.push({ ...broken.strokes[0], id: 's3' });
  assert.ok(inspectPlan(broken).issues.some((v) => v.includes('阶段')));
  assert.ok(inspectPlan(broken).issues.some((v) => v.includes('重复')));
  broken.strokes[0].points[0].x = NaN;
  assert.ok(inspectPlan(broken).issues.some((v) => v.includes('坐标')));
  const long = plan();
  long.strokes[0].points = [
    { x: 0, y: 0 },
    { x: 320, y: 320 },
  ];
  assert.ok(inspectPlan(long).issues.some((v) => v.includes('过长')));
  const over = plan();
  over.strokes = Array.from({ length: 201 }, (_, i) => ({
    ...over.strokes[0],
    id: String(i),
  }));
  assert.equal(inspectPlan(over).passed, false);
});
test('near-point paths are flagged as a usability question, not an effectiveness result', () => {
  const dot = plan();
  dot.strokes[0].points = [
    { x: 10, y: 10 },
    { x: 10.01, y: 10 },
  ];
  const q = inspectPlan(dot);
  assert.equal(q.shortActions, 1);
  assert.equal(q.passed, true);
  assert.equal(q.warnings.length, 1);
});
