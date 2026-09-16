import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planBudgetStrokes } from '../../src/lib/budget-strokes';
import { allocatePassBudgets, type PlanningProgress } from '../../src/lib/stroke-config';
import type { ImageSource } from '../../src/lib/stroke-engine';
function source(width = 64, height = 48): ImageSource {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (
        x > width * 0.2 &&
        x < width * 0.8 &&
        y > height * 0.2 &&
        y < height * 0.8
      ) {
        data[i] = 40;
        data[i + 1] = 130;
        data[i + 2] = 80;
      }
    }
  return { width, height, data };
}
test('budget planning is bounded, repeatable and produces real drawable movements', async () => {
  const a = await planBudgetStrokes(source(), 320, 240);
  assert.ok(a.length > 0 && a.length <= 1000);
  assert.deepEqual(a, await planBudgetStrokes(source(), 320, 240));
  for (const s of a) {
    assert.ok(s.color.every((c) => Number.isFinite(c) && c >= 0 && c <= 1));
    assert.ok(s.width >= 1 && s.width <= 128);
    assert.ok(
      s.points.every((p) => p.x >= 0 && p.x <= 320 && p.y >= 0 && p.y <= 240),
    );
    const distance = Math.hypot(
      s.points[0].x - s.points[1].x,
      s.points[0].y - s.points[1].y,
    );
    assert.ok(distance > 2 && distance <= 400 * 0.66);
  }
});
test('a smaller budget replans instead of truncating the 200-stroke result', async () => {
  const a = await planBudgetStrokes(source(), 64, 48, 25);
  const b = await planBudgetStrokes(source(), 64, 48, 200);
  assert.ok(a.length <= 25);
  assert.notDeepEqual(a, b.slice(0, 25));
});
test('transparent RGB cannot create hidden color and invalid budgets reject', async () => {
  const s = source();
  for (let i = 3; i < s.data.length; i += 4) s.data[i] = 0;
  assert.deepEqual(await planBudgetStrokes(s, 64, 48), []);
  await assert.rejects(planBudgetStrokes(s, 64, 48, 1001));
  await assert.rejects(planBudgetStrokes(s, 64, 48, NaN));
});

test('progress reports optimization rounds without changing the accepted sequence', async () => {
  const progress: PlanningProgress[] = [];
  const withProgress = await planBudgetStrokes(source(), 64, 48, 40, 2, .85, p => progress.push(p));
  assert.deepEqual(withProgress, await planBudgetStrokes(source(), 64, 48, 40));
  assert.equal(progress[0].completed, 0);
  assert.equal(progress.at(-1)?.completed, 40);
  assert.equal(progress.at(-1)?.strokes, withProgress.length);
  assert.ok(progress.every((p, i) => i === 0 || p.completed >= progress[i - 1].completed));
});

test('five-pass planning stays coarse-to-fine and visits cells in row order at every budget', async () => {
  assert.deepEqual(allocatePassBudgets(1000), [60, 120, 220, 280, 320]);
  for (const budget of [1, 2, 25, 100, 200, 300, 500, 700, 1000]) {
    const quotas = allocatePassBudgets(budget);
    assert.equal(quotas.reduce((a, b) => a + b, 0), budget);
    const strokes = await planBudgetStrokes(source(), 320, 240, budget);
    assert.ok(strokes.length > 0 && strokes.length <= budget);
    const counts = [0, 0, 0, 0, 0];
    strokes.forEach((s, i) => {
      const p = s.planning!;
      counts[p.passIndex]++;
      assert.ok(p.cell >= 0 && p.cell < p.grid ** 2);
      if (!i) return;
      const previous = strokes[i - 1];
      assert.ok(s.width <= previous.width);
      assert.ok(p.passIndex >= previous.planning!.passIndex);
      if (p.passIndex === previous.planning!.passIndex) assert.ok(p.cell >= previous.planning!.cell);
    });
    counts.forEach((count, i) => assert.ok(count <= quotas[i]));
  }
});

test('portrait and opaque study plans retain bounded widths, layers and deterministic output', async () => {
  const s = source(32, 80);
  const a = await planBudgetStrokes(s, 32, 80, 100, 1, 1);
  assert.ok(a.length > 0);
  assert.ok(a.every((stroke, i) => stroke.width >= 1 && (!i || stroke.width <= a[i - 1].width)));
  assert.deepEqual(a, await planBudgetStrokes(s, 32, 80, 100, 3, 1));
});
