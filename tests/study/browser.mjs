import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const cwd = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'startrace-browser-'));
const admin = randomBytes(24).toString('hex'),
  r1 = randomBytes(24).toString('hex'),
  r2 = randomBytes(24).toString('hex'),
  code = randomBytes(24).toString('hex');
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', '3002', '-H', '127.0.0.1'],
  {
    cwd,
    env: {
      ...process.env,
      STUDY_DATA_DIR: dir,
      ANALYTICS_ADMIN_TOKEN: admin,
      STUDY_RATER_1_TOKEN: r1,
      STUDY_RATER_2_TOKEN: r2,
    },
  },
);
let log = '';
server.stdout.on('data', (c) => (log += c));
server.stderr.on('data', (c) => (log += c));
const url = 'http://127.0.0.1:3002';
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url + '/api/studies')).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', async (r) => {
    if (r.url().includes('/api/studies') && !r.ok())
      console.log('API error', await r.text());
  });
  await page.goto(url + '/admin/studies');
  await page.getByLabel('研究者口令').fill(admin);
  await page.getByRole('button', { name: '读取 / 刷新' }).click();
  await page.getByRole('button', { name: '准备盆栽候选图' }).click();
  await page.getByText('两条件共用的参考图').waitFor({ timeout: 30000 });
  await page.screenshot({ path: dir + '/admin-material.png', fullPage: true });
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: '保存材料与计划' }).click();
  await page.getByText('该材料使用当前算法。', { exact: true }).waitFor();
  const executionCard = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载预试执行卡' }).click();
  await (await executionCard).saveAs(join(dir, 'execution-card.json'));
  const handoffDownloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存并下载版本交接包' }).click();
  const handoffDownload = await handoffDownloadEvent;
  const handoffId = handoffDownload.suggestedFilename().replace('研究版本交接-', '').replace('.json', '');
  await handoffDownload.saveAs(join(dir, 'handoff.json'));
  const handoff = JSON.parse(readFileSync(join(dir, 'handoff.json'), 'utf8'));
  if (handoff.status !== 'draft' || handoff.study.published || !handoff.material.plan.strokes.length) throw new Error('Handoff changed publication or omitted material');
  if (!readFileSync(join(dir, 'handoffs', `${handoffId}.json`)).equals(readFileSync(join(dir, 'handoff.json')))) throw new Error('Handoff bytes mismatch');
  if ((await page.request.get(url + '/api/studies?action=handoffDownload&id=' + handoffId)).status() !== 403) throw new Error('Handoff access failure');
  await page.getByRole('button', { name: '发布此研究批次' }).click();
  await page
    .getByText(
      '当前状态：已开放入组，材料冻结。入组后不能修改本批次材料和协议。',
    )
    .waitFor();
  const pilot = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pilot.goto(url + '/admin/studies/pilot');
  if ((await pilot.request.get(url + '/api/studies?action=pilot')).status() !== 403) throw new Error('Pilot privacy failure');
  await pilot.getByLabel('研究者口令').fill(admin);
  await pilot.getByRole('button', { name: '读取 / 刷新' }).click();
  await pilot.getByRole('heading', { name: '预试进度', exact: true }).waitFor();
  await pilot.getByLabel('问题描述', { exact: true }).fill('synthetic pilot test issue');
  await pilot.getByRole('button', { name: '记录问题', exact: true }).click();
  await pilot.getByRole('heading', { name: 'synthetic pilot test issue' }).waitFor();
  await pilot.getByLabel('修复与复验说明').fill('synthetic fix verified');
  await pilot.getByRole('button', { name: '保存说明并解决' }).click();
  await pilot.getByText('阻断 · 已解决 · 修订 2', { exact: true }).waitFor();
  for (const box of await pilot.getByRole('checkbox').all()) await box.check();
  await pilot.getByLabel('实际复核说明', { exact: true }).fill('synthetic checks only; not a real pilot');
  await pilot.getByRole('button', { name: '保存实际复核', exact: true }).click();
  const pilotDownload = pilot.waitForEvent('download');
  await pilot.getByRole('button', { name: '下载预试执行记录 JSON' }).click();
  await (await pilotDownload).saveAs(join(dir, 'pilot-execution.json'));
  const pilotReport = JSON.parse(readFileSync(join(dir, 'pilot-execution.json'), 'utf8'));
  if (pilotReport.ready || pilotReport.complete !== 0 || pilotReport.issues[0].status !== 'resolved') throw new Error('Pilot gate/state mismatch');
  if (pilotReport.workload.groups.some(g => g.elapsedMs.median !== null)) throw new Error('Empty pilot falsely reports durations');
  const savedReviewEvent = pilot.waitForEvent('download');
  await pilot.getByRole('button', { name: '保存复盘到后端并下载' }).click();
  const savedReview = await savedReviewEvent;
  const savedId = savedReview.suggestedFilename().replace('预试复盘-', '').replace('.json', '');
  await savedReview.saveAs(join(dir, 'pilot-saved-review.json'));
  if (!readFileSync(join(dir, 'pilot-reviews', `${savedId}.json`)).equals(readFileSync(join(dir, 'pilot-saved-review.json')))) throw new Error('Pilot stored/downloaded report mismatch');
  if ((await pilot.request.get(url + '/api/studies?action=pilotDownload&id=' + savedId)).status() !== 403) throw new Error('Pilot download privacy failure');
  if (await pilot.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Pilot mobile overflow');
  await pilot.screenshot({ path: join(dir, 'pilot-mobile.png'), fullPage: true });
  await pilot.close();
  const call = async (ctx, body, token = '') => {
    const response = await ctx.request.post(url + '/api/studies', {
      data: body,
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
    const result = await response.json();
    if (!response.ok()) throw new Error(JSON.stringify(result));
    return result;
  };
  let context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  let person = await context.newPage();
  person.on('pageerror', (e) => errors.push(e.message));
  await person.goto(url + '/study');
  await person.getByLabel('研究码', { exact: true }).fill(code);
  for (const c of await person.getByRole('checkbox').all()) await c.check();
  await person.getByRole('button', { name: '同意并进入' }).click();
  await person.getByRole('button', { name: '准备练习图' }).waitFor();
  await person.getByRole('button', { name: '准备练习图' }).click();
  await person.getByRole('button', { name: '开始练习', exact: true }).click();
  await person.getByRole('button', { name: '完成并提交' }).waitFor();
  // Fast-forward only the isolated synthetic fixture's practice timestamp and browser clock.
  const db = new DatabaseSync(join(dir, 'study.sqlite'));
  db.exec('PRAGMA busy_timeout=5000');
  const record = db
    .prepare("select id,data from records where kind='participant'")
    .get();
  const p = JSON.parse(record.data);
  p.practiceStartedAt = new Date(Date.now() - 100000).toISOString();
  db.prepare("update records set data=? where kind='participant' and id=?").run(
    JSON.stringify(p),
    record.id,
  );
  // The UI timer itself is exercised in a separate synthetic timeout check. Complete practice via API for the full workflow.
  await call(context, { action: 'practice' });
  await person.reload();
  await person.getByRole('button', { name: '准备第一轮' }).click();
  async function questionnaire() {
    for (const field of await person.locator('fieldset').all())
      await field.locator('input[type=radio]').nth(4).check();
    await person.getByRole('button', { name: '提交问卷' }).click();
  }
  for (let period = 1; period <= 2; period++) {
    await person.getByText('开始前的感受', { exact: true }).waitFor();
    await questionnaire();
    await person.getByRole('button', { name: '开始本轮绘画' }).click();
    await person.getByRole('button', { name: '完成并提交' }).waitFor();
    const canvas = person.getByLabel('绘画画布');
    const box = await canvas.boundingBox();
    await person.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.35);
    await person.mouse.down();
    await person.mouse.move(
      box.x + box.width * 0.6,
      box.y + box.height * 0.65,
      { steps: 12 },
    );
    await person.mouse.up();
    if (period === 1) await context.setOffline(true);
    await person.getByRole('button', { name: '完成并提交' }).click();
    if (period === 1) {
      await person.getByRole('button', { name: '重试保存' }).waitFor();
      await context.setOffline(false);
      await person.getByRole('button', { name: '重试保存' }).click();
    }
    await person
      .getByText('本轮结束后的感受', { exact: true })
      .waitFor({ timeout: 15000 });
    await questionnaire();
    if (period === 1) {
      await person.getByRole('heading', { name: '轮间休息', exact: true }).waitFor();
      const srow = db
        .prepare("select id,data from records where kind='session'")
        .all()
        .find((r) => JSON.parse(r.data).period === 1);
      const s = JSON.parse(srow.data);
      s.finalizedAt = new Date(Date.now() - 130000).toISOString();
      db.prepare("update records set data=? where kind='session' and id=?").run(
        JSON.stringify(s),
        srow.id,
      );
      await person.reload();
      await person.getByRole('button', { name: '准备第二轮' }).click();
    }
  }
  await person.getByRole('button', { name: '保存访谈' }).click();
  await person.getByText('访谈已保存，谢谢参与。').waitFor();
  await person.screenshot({ path: dir + '/pair-report.png', fullPage: true });
  // Exercise the opposite order with a second synthetic participant; assignment randomness is covered in domain tests.
  const blockRow = db
    .prepare("select id,data from records where kind='block'")
    .get();
  const block = JSON.parse(blockRow.data);
  const desired = p.order === 'AB' ? 'BA' : 'AB';
  const match = block.findIndex((v, i) => i > 0 && v === desired);
  [block[1], block[match]] = [block[match], block[1]];
  db.prepare("update records set data=? where kind='block' and id=?").run(
    JSON.stringify(block),
    blockRow.id,
  );
  context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  person = await context.newPage();
  person.on('pageerror', (e) => errors.push(e.message));
  const secondJoin = await call(context, {
    action: 'enroll',
    code: code + '-second',
    studyId: p.studyId,
    eligible: true,
    logs: true,
    artwork: true,
    adult: true,
  });
  const duplicateContext = await browser.newContext();
  const duplicatePage = await duplicateContext.newPage();
  await duplicatePage.goto(url + '/study');
  await duplicatePage.getByLabel('研究码', { exact: true }).fill(code);
  for (const checkbox of await duplicatePage.getByRole('checkbox').all()) await checkbox.check();
  await duplicatePage.getByRole('button', { name: '同意并进入' }).click();
  await duplicatePage.getByText('研究码已存在，请换一个新的研究码', { exact: false }).waitFor();
  await duplicateContext.close();
  await page.getByRole('button', { name: '读取 / 刷新' }).click();
  await page.getByRole('heading', { name: '已有研究测试（2）', exact: true }).waitFor();
  await page.getByRole('button', { name: '查看测试', exact: true }).first().click();
  await page.getByRole('heading', { name: code + '-second · 两次绘画对比', exact: true }).waitFor();
  const secondPerson = secondJoin.participant;
  const secondRow = db
    .prepare("select data from records where kind='participant' and id=?")
    .get(secondPerson.pairId);
  const secondStored = JSON.parse(secondRow.data);
  secondStored.practiceAt = new Date().toISOString();
  secondStored.practiceStartedAt = new Date(Date.now() - 100000).toISOString();
  db.prepare("update records set data=? where kind='participant' and id=?").run(
    JSON.stringify(secondStored),
    secondPerson.pairId,
  );
  if (secondPerson.order === p.order)
    throw new Error('Expected opposite order');
  await person.goto(url + '/study');
  await person.getByRole('button', { name: '准备第一轮' }).click();
  for (let period = 1; period <= 2; period++) {
    await person.getByText('开始前的感受', { exact: true }).waitFor();
    await questionnaire();
    await person.getByRole('button', { name: '开始本轮绘画' }).click();
    await person.getByRole('button', { name: '完成并提交' }).waitFor();
    const canvas = person.getByLabel('绘画画布');
    const box = await canvas.boundingBox();
    await person.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.35);
    await person.mouse.down();
    await person.mouse.move(
      box.x + box.width * 0.6,
      box.y + box.height * 0.65,
      { steps: 12 },
    );
    await person.mouse.up();
    if (period === 1) await context.setOffline(true);
    await person.getByRole('button', { name: '完成并提交' }).click();
    if (period === 1) {
      await person.getByRole('button', { name: '重试保存' }).waitFor();
      await context.setOffline(false);
      await person.getByRole('button', { name: '重试保存' }).click();
    }
    await person
      .getByText('本轮结束后的感受', { exact: true })
      .waitFor({ timeout: 15000 });
    await questionnaire();
    if (period === 1) {
      // Wait for the post questionnaire to persist before changing synthetic time.
      await person.getByRole('heading', { name: '轮间休息', exact: true }).waitFor();
      const srow = db
        .prepare("select id,data from records where kind='session'")
        .all()
        .find(
          (r) =>
            JSON.parse(r.data).period === 1 &&
            JSON.parse(r.data).pairId === secondPerson.pairId,
        );
      const s = JSON.parse(srow.data);
      s.finalizedAt = new Date(Date.now() - 130000).toISOString();
      db.prepare("update records set data=? where kind='session' and id=?").run(
        JSON.stringify(s),
        srow.id,
      );
      await person.reload();
      await person.getByRole('button', { name: '准备第二轮' }).click();
    }
  }
  await person.getByRole('button', { name: '保存访谈' }).click();
  await person.getByText('访谈已保存，谢谢参与。').waitFor();
  await person.screenshot({
    path: dir + '/pair-report-second.png',
    fullPage: true,
  });
  const srows = db
    .prepare("select data from records where kind='session'")
    .all()
    .map((r) => JSON.parse(r.data));
  if (
    srows.length !== 4 ||
    srows.some(
      (s) =>
        !s.finalizedAt ||
        !s.artifactHash ||
        !s.post ||
        s.events.filter((e) => e.type === 'stroke_ended').length !== 1,
    )
  )
    throw new Error('Session integrity failed');
  for (const s of srows) {
    await call(
      context,
      { action: 'rate', sessionId: s.id, scores: Array(10).fill(2) },
      r1,
    );
    await call(
      context,
      { action: 'rate', sessionId: s.id, scores: Array(10).fill(1) },
      r2,
    );
    await call(
      context,
      {
        action: 'include',
        sessionId: s.id,
        decision: 'include',
        reason: 'synthetic fixture',
      },
      admin,
    );
  }
  const exported = await call(
    context,
    { action: 'freeze', studyId: p.studyId },
    admin,
  );
  const dataset = JSON.parse(
    readFileSync(
      join(dir, 'exports', exported.exportId, 'dataset.json'),
      'utf8',
    ),
  );
  if (
    dataset.analysis.completion.n !== 2 ||
    dataset.pairs[0].control.metrics.completion !== 75
  )
    throw new Error('Rating/report mismatch');
  // Authorization and blind ratings are checked over HTTP, not by hiding controls.
  const forbidden = await context.request.get(url + '/api/studies?action=artwork&id=' + srows.find(s => s.pairId === p.pairId).id);
  if (forbidden.status() !== 403) throw new Error('Cross-participant artwork access');
  const blind = await context.request.get(url + '/api/studies?action=ratings&studyId=' + p.studyId, { headers: { Authorization: 'Bearer ' + r1 } });
  const blindData = await blind.json();
  if (blindData.artworks.some(a => 'condition' in a || 'participantId' in a || a.rating?.rater !== 'rater1')) throw new Error('Rater identity leak');
  const recoveryContext = await browser.newContext();
  const recoveredPerson = (await call(recoveryContext, { action: 'enroll', code: code + '-recovery', studyId: p.studyId, eligible: true, logs: true, artwork: true, adult: true })).participant;
  const storedPerson = JSON.parse(db.prepare("select data from records where kind='participant' and id=?").get(recoveredPerson.pairId).data);
  storedPerson.practiceAt = new Date().toISOString();
  db.prepare("update records set data=? where kind='participant' and id=?").run(JSON.stringify(storedPerson), storedPerson.pairId);
  const interrupted = (await call(recoveryContext, { action: 'session', period: 1 })).session;
  await call(recoveryContext, { action: 'questionnaire', sessionId: interrupted.id, phase: 'pre', answers: { willingness: null, concern: 4 } });
  await call(recoveryContext, { action: 'start', sessionId: interrupted.id, pageId: 'synthetic-page' });
  const activeRecovery = await recoveryContext.request.post(url + '/api/studies', { data: { action: 'recover', sessionId: interrupted.id } });
  if (activeRecovery.status() !== 400) throw new Error('Active tab protection missing');
  const interruptedRow = JSON.parse(db.prepare("select data from records where kind='session' and id=?").get(interrupted.id).data);
  interruptedRow.lastSeenAt = new Date(Date.now() - 20000).toISOString();
  db.prepare("update records set data=? where kind='session' and id=?").run(JSON.stringify(interruptedRow), interrupted.id);
  const recovered = await call(recoveryContext, { action: 'recover', sessionId: interrupted.id });
  if (recovered.session.state !== 'technical_error' || !recovered.session.rawHash) throw new Error('Recovery lost terminal data');
  await call(recoveryContext, { action: 'retest', sessionId: interrupted.id, reason: 'synthetic refresh fixture' }, admin);
  const attempts = db.prepare("select data from records where kind='session'").all().map(r => JSON.parse(r.data)).filter(s => s.pairId === recoveredPerson.pairId);
  if (attempts.length !== 2 || !attempts.some(s => s.supersedes === interrupted.id) || !attempts.some(s => s.id === interrupted.id && s.inclusion === 'exclude')) throw new Error('Retest lineage lost');
  await page.goto(url + '/admin/studies/pilot');
  await page.getByLabel('研究者口令').fill(admin);
  await page.getByRole('button', { name: '读取 / 刷新' }).click();
  await page.getByRole('heading', { name: '任务负担复盘', exact: true }).waitFor();
  const workloadResponse = await page.request.get(url + '/api/studies?action=pilot', { headers: { Authorization: 'Bearer ' + admin } });
  const workload = (await workloadResponse.json()).workload;
  if (workload.pairedElapsedDifferenceMs.n !== 2) throw new Error('Pilot paired workload mismatch');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('details summary').first().click();
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Workload mobile overflow');
  await page.screenshot({ path: join(dir, 'pilot-workload-mobile.png'), fullPage: true });
  const withdrawn = JSON.parse(db.prepare("select data from records where kind='participant' and id=?").get(recoveredPerson.pairId).data);
  withdrawn.withdrawnAt = new Date().toISOString();
  db.prepare("update records set data=? where kind='participant' and id=?").run(JSON.stringify(withdrawn), withdrawn.pairId);
  await call(context, { action: 'purge_withdrawal', pairId: withdrawn.pairId }, admin);
  const removed = await page.request.get(url + '/api/studies?action=pilotDownload&id=' + savedId, { headers: { Authorization: 'Bearer ' + admin } });
  if (removed.status() !== 404) throw new Error('Withdrawal retained pilot report');
  await call(context, { action: 'pilotExport' }, admin);
  for (const route of [
    '/',
    '/create',
    '/study',
    '/simplify',
    '/admin/studies',
    '/rater',
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url + route);
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (overflow) throw new Error('Overflow ' + route);
    await page.screenshot({
      path: dir + '/' + (route.replaceAll('/', '-') || 'home') + '-mobile.png',
      fullPage: true,
    });
  }
  if (errors.length) throw new Error(errors.join('\n'));
  db.close();
  console.log(
    JSON.stringify({
      status: 'PASS',
      checks: [
        'material planning',
        'enrollment and shared practice',
        'AB and BA complete UI workflows',
        'offline finish and retry',
        'real canvas stroke events',
        'post questionnaires and interview',
        'two independent raters',
        'persistent individual JSON and paired analysis',
        'active-page protection and refresh recovery',
        'linked technical retest and original exclusion',
        'cross-participant access and rater blinding',
        '390px routes',
      ],
      artifacts: dir,
    }),
  );
} catch (e) {
  console.error(e);
  writeFileSync(dir + '/server.log', log);
  console.log('Artifacts: ' + dir);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
