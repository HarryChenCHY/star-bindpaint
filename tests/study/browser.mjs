import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const listener=createServer();
await new Promise((resolve,reject)=>listener.listen(0,'127.0.0.1',resolve).once('error',reject));
const { port }=listener.address();
await new Promise(resolve=>listener.close(resolve));
const base='http://127.0.0.1:'+port, api=base+'/api/expression-study';
const dir=mkdtempSync(join(tmpdir(),'startrace-expression-browser-'));
const password=randomBytes(16).toString('hex'), rater=randomBytes(16).toString('hex');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'-H','127.0.0.1'],{
  env:{...process.env,STUDY_DATA_DIR:dir,EXPRESSION_ADMIN_PASSWORD:password,STUDY_RATER_1_TOKEN:rater},
});
let log='', browser;
const participantCode=process.env.STARTRACE_STUDY_TEST_CODE ?? 'F16';
const group=Number(participantCode.slice(1)) > 12 ? 'auto' : 'manual';
server.stdout.on('data',chunk=>{log+=chunk;});
server.stderr.on('data',chunk=>{log+=chunk;});
const closed=once(server,'exit');

try {
  let ready=false;
  for(let i=0;i<70;i++){
    try { if ((await fetch(api)).ok) {ready=true;break;} } catch {}
    if(server.exitCode!==null) break;
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert.ok(ready,'Run the Next production build before the browser test.');
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
  const admin=await browser.newPage({viewport:{width:1440,height:900}});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  for(const p of [admin,page]) p.on('pageerror',e=>errors.push(e.message));
  assert.equal((await admin.request.get(api+'?action=list')).status(),401);
  await admin.goto(base+'/admin/studies');
  await admin.getByLabel('管理员密码').fill(password);
  await admin.getByRole('button',{name:'登录',exact:true}).click();
  await admin.getByRole('heading',{name:'知情同意书'}).waitFor();
  for(const [label,text] of [['研究者与所属单位','Test fixture'],['联系及撤回方式','fixture@example.invalid'],['伦理审查信息','Isolated test only'],['补偿说明','Test fixture']]){
    await admin.getByLabel(label).fill(text);
  }
  await admin.getByRole('checkbox',{name:/伦理审核决定/}).check();
  await admin.getByRole('button',{name:'保存设置'}).click();
  await admin.getByText('知情同意书设置已保存。').waitFor();

  const allocation=admin.getByRole('table',{name:'正式测试参与者分配表'});
  assert.equal(await allocation.locator('tbody tr').count(),24);
  await admin.getByRole('button',{name:'预试 · 6 个编号'}).click();
  assert.equal(await admin.getByRole('table',{name:'预试参与者分配表'}).locator('tbody tr').count(),6);
  await admin.getByRole('button',{name:'正式测试 · 24 个编号'}).click();

  await page.goto(base+'/study');
  await page.getByRole('link',{name:'返回主页'}).click();
  await page.waitForURL(base+'/');
  await page.goto(base+'/study');
  await page.getByRole('group',{name:'选择测试阶段'}).getByRole('button',{name:'正式测试'}).click();
  await page.locator('select[name=group]').selectOption(group==='auto' ? 'manual' : 'auto');
  const numberSelect=page.getByLabel('参与者编号');
  assert.equal(await numberSelect.locator(`option[value="${participantCode}"]`).count(),0);
  await page.locator('select[name=group]').selectOption(group);
  await numberSelect.selectOption(participantCode);
  await page.locator('.expression-assignment-preview').getByText(/第 2 轮/).waitFor();
  await page.getByRole('checkbox',{name:/年满18岁/}).check();
  await page.getByLabel('姓名',{exact:true}).fill('Browser fixture');
  await page.getByLabel('年龄',{exact:true}).fill('28');
  await page.locator('select[name=gender]').selectOption('其他');
  await page.getByLabel('数字绘画经验').selectOption({label:'偶尔尝试'});
  await page.getByLabel('主要操作设备').selectOption({label:'电脑鼠标'});
  assert.equal(await page.getByLabel('研究招募码').count(),0);
  await page.getByRole('button',{name:'同意并开始'}).click();
  await page.getByRole('heading',{name:'记录初始想法'}).waitFor();
  for(const input of await page.getByLabel(/我想表达什么/).all()) await input.fill('把长椅放在视觉中心。');
  assert.ok(await page.getByRole('button',{name:'保存想法，进入练习'}).isDisabled());
  for(const input of await page.getByLabel(/看图感受/).all()) await input.fill('安静、开阔。');
  await page.getByRole('button',{name:'返回主页',exact:true}).click();
  await page.getByRole('alertdialog').getByRole('button',{name:'确认'}).click();
  await page.waitForURL(base+'/');
  await page.goto(base+'/study');
  await page.getByRole('heading',{name:'记录初始想法'}).waitFor();
  assert.equal(await page.getByLabel(/我想表达什么/).first().inputValue(),'把长椅放在视觉中心。');
  const feelings = page.getByLabel(/看图感受/).first();
  await feelings.fill('自动保存的看图感受。');
  await page.waitForResponse(response => response.url() === api && response.request().method() === 'POST' && response.ok());
  await page.reload();
  await page.getByRole('heading',{name:'记录初始想法'}).waitFor();
  assert.equal(await feelings.inputValue(),'自动保存的看图感受。');
  await feelings.fill('安静、开阔。');
  await page.getByRole('button',{name:'保存想法，进入练习'}).click();
  const state=async()=>(await (await page.request.get(api)).json()).record;
  const record=await state();
  assert.equal(record.assignment.code,participantCode);
  assert.equal(record.assignment.group,group);
  const automatic=record.rounds[0].auto;
  const reference=page.locator('.study-reference-float');
  await reference.getByRole('img',{name:'练习参考图'}).waitFor();
  const before=await reference.boundingBox();
  await reference.getByRole('button',{name:'放大参考图'}).click();
  assert.ok((await reference.boundingBox()).width > before.width);
  await reference.getByRole('button',{name:'缩小参考图'}).click();
  await reference.getByRole('button',{name:'收起参考图'}).click();
  assert.equal(await reference.getByRole('img').count(),0);
  await reference.getByRole('button',{name:'展开参考图'}).click();
  const grip=reference.getByRole('button',{name:/移动参考图/});
  const handle=await grip.boundingBox();
  const position=await reference.boundingBox();
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);
  await page.mouse.down();
  await page.mouse.move(handle.x+handle.width/2-85,handle.y+handle.height/2+80,{steps:5});
  await page.mouse.up();
  assert.ok((await reference.boundingBox()).y > position.y+40);
  await reference.getByRole('button',{name:'收起参考图'}).click();
  const library=page.getByRole('button',{name:'素材库',exact:true});
  const tiles=page.locator('.material-library-add');
  await library.click();
  await tiles.first().click();
  await tiles.nth(1).click();
  await page.getByRole('button',{name:'去编排'}).click();
  assert.equal(await page.locator('[data-testid="material-preview"]').count(),automatic ? 3 : 2);
  if(automatic) {
    await page.getByRole('button',{name:'绘画速度'}).click();
    await page.getByRole('button',{name:'光速',exact:true}).click();
    await page.getByRole('button',{name:'收起工具面板'}).click();
    await page.getByRole('button',{name:'确认并继续绘制'}).click();
  } else {
    const artwork = () => page.evaluate(() => window.__paintCanvas.getBaseCanvas().toDataURL());
    const beforePaste = await artwork();
    await page.getByRole('button',{name:'贴到画布',exact:true}).click();
    await page.locator('.free-studio .paint-canvas').waitFor();
    assert.notEqual(await artwork(),beforePaste);
    const afterPaste = await artwork();
    const box = await page.locator('.free-studio .paint-canvas').boundingBox();
    await page.mouse.move(box.x+25,box.y+25);
    await page.mouse.down();
    await page.mouse.move(box.x+85,box.y+45,{steps:8});
    await page.mouse.up();
    assert.notEqual(await artwork(),afterPaste);
  }
  await page.getByRole('button',{name:'结束练习'}).click();
  await page.getByLabel(/你准备怎么做/).fill('先确定画面中心。');
  await page.getByRole('button',{name:'开始本轮计时'}).click();
  await page.getByRole('button',{name:/第一轮创作.*查看任务/}).waitFor();
  assert.equal(await library.count(),record.rounds[0].materials ? 1 : 0);
  await reference.getByRole('img',{name:'参考图 '+record.rounds[0].photo.toUpperCase()}).waitFor();
  await reference.getByRole('button',{name:'收起参考图'}).click();
  if (automatic) {
    await page.getByTestId('co-canvas').waitFor();
    await page.getByRole('button',{name:record.rounds[0].materials ? '确认并继续绘制' : '开始绘制'}).click();
    await page.locator('.stroke-brush-overlay g[transform]').waitFor({state:'attached',timeout:35_000});
  } else {
    const canvas=page.locator('.free-studio .paint-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const box=await canvas.boundingBox();
    await page.mouse.move(box.x+40,box.y+40); await page.mouse.down();
    await page.mouse.move(box.x+110,box.y+82,{steps:12}); await page.mouse.up();
  }
  assert.equal(await page.getByRole('button',{name:'记录一次求助'}).count(),0);
  assert.equal(await page.getByRole('button',{name:'保存并退出'}).count(),0);
  assert.ok(await page.getByRole('complementary',{name:'当前测试任务'}).isVisible());
  await page.getByRole('button',{name:'结束本轮创作'}).click();
  await page.getByRole('heading',{name:'第一轮问卷'}).waitFor();
  assert.equal(await page.locator('.expression-survey fieldset').count(),35);
  assert.ok(await page.getByRole('button',{name:'保存本轮问卷'}).isDisabled());
  for (const field of await page.locator('.expression-survey fieldset').all()) await field.getByRole('radio').first().check();
  await page.locator('input[name=expressionRealized]').nth(5).check();
  await page.locator('input[name=creativeControl]').nth(4).check();
  await page.locator('input[name=interactionEffort]').nth(2).check();
  await page.locator('input[name=sus01]').nth(3).check();
  await page.getByRole('button',{name:'保存本轮问卷'}).click();
  await page.getByRole('heading',{name:'休息'}).waitFor();
  await page.getByRole('button',{name:'结束休息，继续第二轮'}).click();
  await page.getByRole('heading',{name:'第二轮准备'}).waitFor();
  await page.getByLabel(/你准备怎么做/).fill('先确定画面中心。');
  await page.getByRole('button',{name:'开始本轮计时'}).click();
  await page.getByRole('button',{name:/第二轮创作.*查看任务/}).waitFor();
  assert.equal(await library.count(),record.rounds[1].materials ? 1 : 0);
  await reference.getByRole('img',{name:'参考图 '+record.rounds[1].photo.toUpperCase()}).waitFor();
  await reference.getByRole('button',{name:'收起参考图'}).click();
  if(record.rounds[1].materials){
    await library.click();
    await tiles.first().click();
    await page.getByRole('button',{name:'去编排'}).click();
    await page.getByRole('button',{name:automatic ? '确认并继续绘制' : '贴到画布',exact:true}).click();
    if (automatic) await page.locator('.stroke-brush-overlay g[transform]').waitFor({state:'attached',timeout:35_000});
  }
  await page.getByRole('button',{name:'结束本轮创作'}).click();
  await page.getByRole('heading',{name:'第二轮问卷'}).waitFor();
  for (const field of await page.locator('.expression-survey fieldset').all()) await field.getByRole('radio').first().check();
  await page.locator('input[name=creativeControl]').nth(5).check();
  await page.getByRole('button',{name:'保存本轮问卷'}).click();
  await page.getByRole('heading',{name:'访谈文字记录'}).waitFor();
  assert.equal(await page.locator('textarea').count(),6);
  assert.ok(await page.getByRole('button',{name:'保存访谈并完成测试'}).isDisabled());
  for (const answer of await page.locator('textarea').all()) await answer.fill('这一步我先观察画面。');
  await page.getByLabel(automatic ? /看系统逐步画出画面/ : /自己画的画面逐渐成形/).fill('看到画面中心后，我保留了原来的想法。');
  const interview = page.getByLabel(/有素材和无素材的两轮/);
  await interview.fill('有素材时我先确定画面中心。');
  const firstArt = page.getByRole('link',{name:'回看第 1 轮画面'});
  const secondArt = page.getByRole('link',{name:'回看第 2 轮画面'});
  for (const link of [firstArt, secondArt]) {
    const art = await page.request.get(base+(await link.getAttribute('href')));
    assert.equal(art.headers()['content-type'],'image/jpeg');
  }
  await page.getByRole('button',{name:'保存访谈并完成测试'}).click();
  await admin.getByRole('button',{name:'刷新',exact:true}).click();
  await admin.getByText('Browser fixture · 正式测试 · 已完成').waitFor();
  const experience = admin.getByRole('table',{name:'两轮创作体验'});
  assert.equal(await experience.locator('tbody tr').count(),2);
  await experience.getByRole('cell',{name:record.rounds[1].materials ? '已确认' : '未提供',exact:true}).last().waitFor();
  assert.equal((await page.request.get(api+'?action=artwork&id='+record.id+'&file=round2')).status(),401);
  const report=await (await admin.request.get(api+'?action=json&id='+record.id)).json();
  assert.equal(report.status,'completed');
  assert.equal(report.assignment.code,participantCode);
  assert.deepEqual(report.assignment.rounds.map(round=>round.photo),report.rounds.map(round=>round.photo));
  assert.equal(report.rest.endedEarly,true);
  await allocation.getByRole('row',{name:new RegExp(participantCode)}).getByText('已完成').waitFor();
  assert.equal(report.identity.name,'Browser fixture');
  assert.equal(report.forms.intent.aFeeling,'安静、开阔。');
  assert.equal(report.forms.intent.bFeeling,'安静、开阔。');
  assert.equal(report.forms.survey1.sus01,4);
  assert.ok(report.events.round1.some(e=>e.type===(automatic ? 'auto_requested' : 'manual_stroke')));
  assert.equal(report.roundExperience[0].expressionRealized,6);
  assert.equal(report.roundExperience[0].creativeControl,5);
  assert.equal(report.roundExperience[0].interactionEffort,3);
  assert.equal(report.roundExperience[0].materialLayoutConfirmed,false);
  assert.equal(report.roundExperience[1].creativeControl,6);
  assert.equal(report.roundExperience[1].materialLayoutConfirmed,record.rounds[1].materials);
  assert.equal(report.interviewVersion,'experience-review-v2');
  assert.equal(report.forms.interview.composition,'有素材时我先确定画面中心。');
  assert.equal(report.forms.interview.reflection,'看到画面中心后，我保留了原来的想法。');
  assert.equal(report.ratings,undefined);

  const art=await admin.request.get(api+'?action=artwork&id='+record.id+'&file=round2');
  assert.equal(art.headers()['content-type'],'image/jpeg'); assert.ok((await art.body()).length>500);
  const headers={Authorization:'Bearer '+rater};
  assert.deepEqual((await (await admin.request.get(api+'?action=rater-list',{headers})).json()).items,[]);
  assert.equal((await admin.request.get(api+'?action=rater-art&id='+record.id+'&file=round1',{headers})).status(),404);
  assert.equal((await admin.request.post(api,{headers,data:{action:'rate',id:record.id+'-round1',scores:[3,3,3]}})).status(),404);
  assert.equal(await page.getByRole('button',{name:'撤回本次数据'}).count(),0);
  assert.equal((await page.request.post(api,{data:{action:'withdraw'}})).status(),400);
  assert.equal((await page.request.post(api,{data:{action:'admin-delete',id:record.id}})).status(),401);
  assert.equal((await state()).id,record.id);
  await page.getByRole('button',{name:'结束本机测试，登记下一位'}).click();
  await page.getByRole('heading',{name:'选择测试阶段'}).waitFor();
  assert.equal(await state(),null);
  admin.once('dialog',dialog=>dialog.accept());
  await admin.getByRole('button',{name:'删除记录',exact:true}).click();
  await admin.getByText('服务器上的本次记录已删除。').waitFor();
  assert.equal((await admin.request.get(api+'?action=json&id='+record.id)).status(),404);
  assert.deepEqual(errors,[]);
  console.log('Passed: recruitment, practice, creation, surveys, timed break, interview, experience export, authenticated files, scoring exclusion, next participant, and record deletion.');
} catch (error) {
  console.error(log);
  throw error;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  await closed;
  rmSync(dir,{recursive:true,force:true});
}
