import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudyRepository, hash } from '../../src/lib/study/server/repository';
import { AUTH_KIND, consentSignature, IDENTITY_KIND, RECORD_KIND, enrollExpression, removeExpression, roundExperience, saveExpression, savedPath } from '../../src/lib/study/server/expression';
import { CONSENT_VERSION, DEFAULT_SETUP, FORMAL_SLOTS, IMI, LIMITS, OUTCOME_QUESTIONS, PILOT_SLOTS, PRACTICE_MS, REST_MS, ROUND_MS, SUS, VERSION, roundsFor, scoreSurveys, studyAssignments, type RecordState } from '../../src/lib/study/expression';

function storage(t: TestContext) {
  const dir=mkdtempSync(join(tmpdir(),'startrace-expression-test-'));
  const db=new StudyRepository(dir);
  t.after(()=>{db.db.close();rmSync(dir,{recursive:true,force:true});});
  return db;
}
const entrant = {accepted:true,consentVersion:CONSENT_VERSION,version:VERSION,name:'Test Fixture',age:26,experience:'没有经验',device:'电脑鼠标',gender:'其他',group:'manual'};
const jpeg=readFileSync('public/study/expression/park-a.jpg');
const image='data:image/jpeg;base64,'+jpeg.toString('base64');
const move = (db:StudyRepository,p:RecordState, now:number, data:Record<string,unknown>={}) =>
  saveExpression(db,p.id,{action:'next',step:p.step,revision:p.revision,...data},now);

test('formal sample counterbalances both orders and both photo assignments; pilot splits both ways', () => {
  assert.equal(FORMAL_SLOTS.length,LIMITS.formal);
  assert.equal(PILOT_SLOTS.length,LIMITS.pilot);
  assert.equal(PILOT_SLOTS.filter(n=>roundsFor(n)[0].auto).length,3);
  const slots=studyAssignments('formal');
  assert.equal(new Set(slots.map(slot=>slot.code)).size,24);
  assert.equal(slots.filter(slot=>slot.group==='auto').length,12);
  assert.equal(slots.filter(slot=>slot.group==='manual').length,12);
  for (let sequence=0;sequence<8;sequence++) {
    assert.equal(FORMAL_SLOTS.filter(n=>n===sequence).length,3);
    const [one,two]=roundsFor(sequence);
    assert.equal(one.auto,two.auto);
    assert.notEqual(one.photo,two.photo);
    assert.notEqual(one.materials,two.materials);
  }
});

test('assigned codes validate stage and group, lock sequence and reject duplicate registration', t => {
  const db=storage(t);
  assert.throws(()=>enrollExpression(db,{...entrant,age:17},'demo','token',0),/成年/);
  assert.throws(()=>enrollExpression(db,{...entrant,accepted:false},'demo','token',0),/同意/);
  assert.throws(()=>enrollExpression(db,entrant,'pilot','token',0),/更新/);
  const payload={...entrant,setupSignature:consentSignature(DEFAULT_SETUP)};
  const slots=studyAssignments('pilot');
  const records=slots.map((slot,i)=>enrollExpression(db,{...payload,group:slot.group,participantCode:slot.code},'pilot','token'+i,i));
  assert.deepEqual(records.map(p=>p.sequence),PILOT_SLOTS);
  assert.deepEqual(records[3].assignment,slots[3]);
  assert.throws(()=>enrollExpression(db,{...payload,participantCode:'F01'},'pilot','wrongStage',10),/阶段/);
  assert.throws(()=>enrollExpression(db,{...payload,participantCode:'P04'},'pilot','wrongGroup',10),/组别/);
  assert.throws(()=>enrollExpression(db,{...payload,participantCode:'p01'},'pilot','duplicate',10),/已登记/);
  move(db,records[0],10,{action:'exit'});
  assert.throws(()=>enrollExpression(db,{...payload,participantCode:'P01'},'pilot','duplicate',11),/已登记/);
});

test('timeout, rest, draft, JPG checkpoints, and withdrawal preserve the intended boundaries', t => {
  const db=storage(t);
  let p=enrollExpression(db,entrant,'demo','participant',1);
  assert.throws(()=>move(db,p,2,{form:{a:'想法A'}}),/分别/);
  assert.throws(()=>move(db,p,3,{form:{a:'想法A',b:'想法B',aFeeling:'平静',bFeeling:'  '}}),/看图感受/);
  p=move(db,p,3,{form:{a:'想法A',b:'想法B',aFeeling:'平静',bFeeling:'开阔'}});
  assert.equal(p.forms.intent?.bFeeling,'开阔');
  assert.equal(p.step,'practice');
  assert.throws(()=>move(db,p,4,{image:'data:image/jpeg;base64,c2hvcnQ='}),/JPEG/);
  p=move(db,p,3+PRACTICE_MS,{action:'checkpoint',image});
  assert.equal(p.ended.practice?.reason,'timeout');
  assert.throws(()=>move(db,p,p.enteredAt+1,{form:{plan:'  '}}),/创作计划/);
  p=move(db,p,p.enteredAt+1,{form:{plan:'突出主体'}});
  const stale=p;
  p=move(db,p,p.enteredAt+4,{action:'checkpoint',image,layout:'{"pending":[]}',events:[{type:'help',at:p.enteredAt+1}]});
  assert.throws(()=>move(db,stale,stale.enteredAt+5),/刷新/);
  p=move(db,p,p.enteredAt+ROUND_MS,{image});
  assert.equal(p.ended.round1?.reason,'timeout');
  assert.equal(p.events.round1?.[0].type,'help');
  assert.throws(()=>move(db,p,p.enteredAt+1,{form:{imi01:6}}),/全部题目/);
  const answers = Object.fromEntries([...IMI,...SUS,...OUTCOME_QUESTIONS].map(q=>[q.id,3]));
  p=move(db,p,p.enteredAt+1,{form:{...answers,imi01:6,sus01:5,expressionRealized:7,creativeControl:5}});
  p=move(db,p,p.enteredAt+REST_MS-1);
  assert.deepEqual(p.rest,{elapsedMs:REST_MS-1,endedEarly:true});
  p=move(db,p,p.enteredAt+1,{form:{plan:'调整构图'}});
  assert.equal(p.step,'round2');
  p=move(db,p,p.enteredAt+42,{action:'exit',image,draftImage:image,layout:'{"pending":[{"materialId":"test"}]}'});
  assert.equal(p.status,'exited');
  assert.equal(p.ended.round2?.elapsedMs,42);
  const [first,second]=roundExperience(p);
  assert.equal(first.expressionRealized,7);
  assert.equal(first.creativeControl,5);
  assert.equal(second.materialLayoutConfirmed,false);
  assert.equal(second.creativeControl,null);
  assert.deepEqual(db.read(savedPath(p.id,'round2.jpg')),jpeg);
  assert.deepEqual(db.read(savedPath(p.id,'round2-draft.jpg')),jpeg);
  assert.equal(JSON.parse(db.read(savedPath(p.id,'record.json')).toString()).forms.survey1.expressionRealized,7);
  assert.equal(db.read(savedPath(p.id,'record.json')).includes(entrant.name),false);
  assert.equal(JSON.parse(db.read(savedPath(p.id,'identity.json')).toString()).name,entrant.name);
  db.put('expression-rating-2',p.id+'-round1',{scores:[3,4,5]});
  removeExpression(db,p.id);
  assert.equal(db.get(RECORD_KIND,p.id),null);
  assert.equal(db.get(IDENTITY_KIND,p.id),null);
  assert.equal(db.get(AUTH_KIND,hash('participant')),null);
  assert.equal(db.get('expression-rating-2',p.id+'-round1'),null);
  assert.throws(()=>db.read(savedPath(p.id,'round2.jpg')),/ENOENT/);
});

test('standard scale scoring reverses keyed items and leaves partial scores missing', () => {
  const all = Object.fromEntries([...IMI.map(q=>[q.id,q.reverse ? 1 : 7]),...SUS.map(q=>[q.id,q.reverse ? 1 : 5])]);
  const high=scoreSurveys(all);
  assert.equal(high.sus,100);
  assert.deepEqual(Object.values(high.imi),[7,7,7,7]);
  const partial=scoreSurveys({...all,[SUS[0].id]:null,[IMI[0].id]:null});
  assert.equal(partial.sus,null);
  assert.equal(partial.imi.interestEnjoyment,null);
  assert.equal(partial.imi.perceivedCompetence,7);
});
