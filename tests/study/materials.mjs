import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir = mkdtempSync(join(tmpdir(), 'startrace-materials-'));
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', '3003', '-H', '127.0.0.1'],
  { cwd: process.cwd(), env: { ...process.env, STUDY_DATA_DIR: dir } },
);
let log = '',
  browser;
server.stdout.on('data', (c) => (log += c));
server.stderr.on('data', (c) => (log += c));
const url = 'http://127.0.0.1:3003/admin/studies/materials';
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) throw new Error('Test server did not start');
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole('button', { name: '运行 12 张材料检查' }).click();
  await page
    .getByRole('status')
    .filter({ hasText: '已检查 12 / 12' })
    .waitFor({ timeout: 120000 });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出检查 JSON' }).click();
  await (await download).saveAs(join(dir, 'material-report.json'));
  const report = JSON.parse(
    readFileSync(join(dir, 'material-report.json'), 'utf8'),
  );
  if (report.results.length !== 12) throw new Error('Missing fixture');
  const failures = report.results.filter(
    (r) =>
      (r.group === 'simple' && r.status !== 'generated') ||
      (r.status === 'generated' && (!r.checks.passed || !r.deterministic)),
  );
  for (const fixture of ['plant', 'thin', 'busy-background']) {
    const card = page.locator(`[data-material-id="${fixture}"]`);
    await card.screenshot({ path: join(dir, fixture + '.png') });
  }
  const plant = page.locator('[data-material-id="plant"]');
  await plant.getByRole('button', { name: '前 50 笔' }).click();
  const count = await plant.getByLabel('预览笔数').inputValue();
  if (+count !== Math.min(50, report.results[0].checks.total))
    throw new Error('Stage preview mismatch');
  await page.setViewportSize({ width: 390, height: 844 });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw new Error('Mobile overflow');
  await plant.screenshot({ path: join(dir, 'plant-mobile.png') });
  writeFileSync(
    join(dir, 'summary.md'),
    '# P6 材料工程检查（非研究结果）\n\n人工质量审核：待执行。\n\n|材料|类别|状态|笔数|轮廓/大/小|近点状动作|毫秒|\n|---|---|---|---|---|---|---|\n' +
      report.results
        .map(
          (r) =>
            `|${r.title}|${r.group}|${r.status}|${r.checks?.total ?? '—'}|${r.checks ? Object.values(r.checks.counts).join('/') : '—'}|${r.checks?.shortActions ?? '—'}|${Math.round(r.elapsedMs)}|`,
        )
        .join('\n'),
  );
  if (errors.length || failures.length)
    throw new Error(
      JSON.stringify({
        errors,
        failures: failures.map((r) => ({
          id: r.id,
          error: r.error,
          issues: r.checks?.issues,
        })),
      }),
    );
  console.log(
    JSON.stringify({
      status: 'PASS',
      materials: 12,
      generated: report.results.filter((r) => r.status === 'generated').length,
      artifacts: dir,
    }),
  );
} catch (e) {
  writeFileSync(join(dir, 'server.log'), log);
  console.error(e);
  console.log('Artifacts: ' + dir);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
