import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { getRepository, hash, StudyStorageUnavailableError } from '@/lib/study/server/repository';
import {
  AUTH_KIND, IDENTITY_KIND, ID_PATTERN, RECORD_KIND, SETUP_KIND, StudyError, enrollExpression,
  exportRecord, input, removeExpression, roundExperience, saveExpression, savedPath, setupFor, setupFrom,
} from '@/lib/study/server/expression';
import { LIMITS, PHOTOS, VERSION, drawingStep, type RecordState } from '@/lib/study/expression';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const participantCookie = 'startrace-expression';
const adminCookie = 'startrace-expression-admin';
const maxAge = 8 * 60 * 60;
const noStore = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: noStore });
type Repo = ReturnType<typeof getRepository>;
const constantEqual = (left: unknown, right?: string) => typeof left === 'string' && left.length <= 256 && !!right
  && timingSafeEqual(Buffer.from(hash(left)), Buffer.from(hash(right)));
const owner = (repo: Repo, req: NextRequest) => {
  const token = req.cookies.get(participantCookie)?.value;
  const credential = token && repo.get<{ id: string }>(AUTH_KIND, hash(token));
  return credential ? repo.get<RecordState>(RECORD_KIND, credential.id) : null;
};
const admin = (repo: Repo, req: NextRequest) => {
  const token = req.cookies.get(adminCookie)?.value;
  const session = token && repo.get<{ expires: number }>('expression-admin', hash(token));
  return !!session && session.expires > Date.now();
};
const rater = (req: NextRequest) => {
  const token = req.headers.get('authorization')?.replace(/^Bearer /,'');
  if (constantEqual(token,process.env.STUDY_RATER_1_TOKEN)) return 1;
  if (constantEqual(token,process.env.STUDY_RATER_2_TOKEN)) return 2;
  return 0;
};
function cookie(response: NextResponse, req: NextRequest, name: string, value: string, ttl: number) {
  response.cookies.set(name,value,{ httpOnly: true, sameSite: 'strict', secure: req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https', path: '/', maxAge: ttl });
  return response;
}
function problem(error: unknown) {
  if (error instanceof StudyError) return reply({ error: error.message },error.status);
  if (error instanceof StudyStorageUnavailableError) return reply({ code:'STUDY_UNAVAILABLE', error:error.message },503);
  console.error('Expression study storage request failed', error instanceof Error ? error.name : 'unknown');
  return reply({ error: '测试服务暂时无法保存或读取，请重试或联系研究者。' },503);
}
function privateFile(repo: Repo, id: string, file: string, type: string, inline = false) {
  const bytes = repo.read(savedPath(id,file));
  return new NextResponse(new Uint8Array(bytes), { headers: {
    ...noStore, 'Content-Type': type, 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${id}-${file}"`,
  } });
}
function hasFile(record: RecordState, file: string) {
  const step = file.replace(/-reference$/,'');
  return drawingStep(step) && !!(file.endsWith('-reference') ? record.reference[step] : record.artwork[step]);
}
function ratingsFor(repo: Repo, id: string) {
  return [1,2].map(i => repo.get(`expression-rating-${i}`,id));
}

export async function GET(req: NextRequest) {
  try {
    const repo = getRepository();
    const params = req.nextUrl.searchParams;
    const action = params.get('action') ?? 'state';
    if (action === 'state') {
      const setup = setupFor(repo);
      return reply({ record: owner(repo,req), setup, setupSignature: hash(JSON.stringify(setup)), version: VERSION, now: Date.now() });
    }
    if (action === 'resume-image') {
      const record = owner(repo,req);
      const file = params.get('file') ?? '';
      if (!record || !hasFile(record,file)) throw new StudyError('没有可恢复的画面。',404);
      return privateFile(repo,record.id,`${file}.jpg`,'image/jpeg',true);
    }
    if (action === 'rater-list' || action === 'rater-art') {
      const role = rater(req);
      if (!role) throw new StudyError('请输入评分者口令。',401);
      if (action === 'rater-list') {
        const items = repo.all<RecordState>(RECORD_KIND).filter(p => p.version !== VERSION && p.mode !== 'demo' && p.status !== 'active').flatMap(p =>
          ([0,1] as const).flatMap(i => {
            const step = i === 0 ? 'round1' : 'round2';
            if (!p.artwork[step] || !p.ended[step] || p.ended[step]?.reason === 'exited') return [];
            const photo = p.rounds[i].photo;
            const id = `${p.id}-${step}`;
            return [{ id, photo: PHOTOS[photo].path, intent: p.forms.intent?.[photo], rating: repo.get(`expression-rating-${role}`,id) }];
          }));
        return reply({ items: items.sort((a,b) => hash(a.id).localeCompare(hash(b.id))) });
      }
      const id = params.get('id') ?? '', file = params.get('file') ?? '';
      const record = ID_PATTERN.test(id) && repo.get<RecordState>(RECORD_KIND,id);
      if (!record || record.version === VERSION || record.mode === 'demo' || record.status === 'active' || (file !== 'round1' && file !== 'round2') || !record.artwork[file] || !record.ended[file] || record.ended[file]?.reason === 'exited')
        throw new StudyError('找不到评分作品。',404);
      return privateFile(repo,id,`${file}.jpg`,'image/jpeg',true);
    }
    if (!admin(repo,req)) throw new StudyError('请先登录研究后台。',401);
    const records = () => repo.all<RecordState>(RECORD_KIND).sort((a,b) => b.createdAt-a.createdAt);
    const report = (record: RecordState) => ({
      ...exportRecord(record),
      identity: repo.get(IDENTITY_KIND,record.id),
      ...(record.version !== VERSION ? {
        ratings: { round1: ratingsFor(repo,`${record.id}-round1`), round2: ratingsFor(repo,`${record.id}-round2`) },
      } : {}),
    });
    if (action === 'list') return reply({
      setup: setupFor(repo), limits: LIMITS,
      records: records().map(p => ({ id:p.id, version:p.version, mode:p.mode, assignment:p.assignment, rounds:p.rounds, roundExperience:roundExperience(p), status:p.status, step:p.step, updatedAt:p.updatedAt, createdAt:p.createdAt, profile:p.profile, name:repo.get<{ name:string }>(IDENTITY_KIND,p.id)?.name, artwork:p.artwork, draftArtwork:p.draftArtwork })),
    });
    if (action === 'export-all') {
      const mode = params.get('mode');
      const rows = records().filter(p => mode === 'all' || (mode ? p.mode === mode : p.mode !== 'demo')).map(report);
      return new NextResponse(JSON.stringify({ version: VERSION, exportedAt: new Date().toISOString(), records: rows },null,2),{ headers: { ...noStore, 'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="startrace-expression-records.json"' } });
    }
    const id = params.get('id') ?? '';
    const record = ID_PATTERN.test(id) && repo.get<RecordState>(RECORD_KIND,id);
    if (!record) throw new StudyError('找不到该测试记录。',404);
    if (action === 'json') return new NextResponse(JSON.stringify(report(record),null,2),{ headers: {
      ...noStore, 'Content-Type':'application/json; charset=utf-8',
      'Content-Disposition': `${params.get('view') === '1' ? 'inline' : 'attachment'}; filename="${id}.json"`,
    } });
    const file = params.get('file') ?? '';
    if (action === 'artwork' && drawingStep(file) && record.artwork[file]) return privateFile(repo,id,`${file}.jpg`,'image/jpeg',params.get('view') === '1');
    if (action === 'draft' && drawingStep(file) && record.draftArtwork?.[file]) return privateFile(repo,id,`${file}-draft.jpg`,'image/jpeg',params.get('view') === '1');
    throw new StudyError('找不到文件。',404);
  } catch (error) { return problem(error); }
}

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('sec-fetch-site') === 'cross-site') throw new StudyError('请求来源无效。',403);
    const raw = await req.text();
    if (raw.length > 1_800_000) throw new StudyError('保存内容过大。',413);
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { throw new StudyError('请求格式无效。'); }
    const data = input(payload), repo = getRepository(), now = Date.now();
    if (data.action === 'login') {
      if (!process.env.EXPRESSION_ADMIN_PASSWORD) throw new StudyError('管理员密码尚未配置。',503);
      const token = randomBytes(32).toString('hex');
      const allowed = repo.transaction(() => {
        const key = 'admin-login', kind = 'expression-rate-limit';
        let limit = repo.get<{ since:number; attempts:number }>(kind,key);
        if (!limit || now-limit.since >= 15*60_000) limit = { since:now, attempts:0 };
        if (limit.attempts >= 8) throw new StudyError('登录尝试过多，请15分钟后再试。',429);
        if (!constantEqual(data.password,process.env.EXPRESSION_ADMIN_PASSWORD)) {
          repo.put(kind,key,{ ...limit, attempts:limit.attempts+1 });
          return false;
        }
        repo.delete(kind,key);
        repo.db.prepare("DELETE FROM records WHERE kind='expression-admin' AND json_extract(data,'$.expires')<=?").run(now);
        repo.put('expression-admin',hash(token),{ expires:now+maxAge*1000 });
        return true;
      });
      if (!allowed) throw new StudyError('管理员密码不正确。',401);
      return cookie(reply({ ok:true }),req,adminCookie,token,maxAge);
    }
    if (data.action === 'logout') {
      const token = req.cookies.get(adminCookie)?.value;
      if (token) repo.delete('expression-admin',hash(token));
      return cookie(reply({ ok:true }),req,adminCookie,'',0);
    }
    if (data.action === 'setup') {
      if (!admin(repo,req)) throw new StudyError('请先登录研究后台。',401);
      const setup = setupFrom(data);
      repo.put(SETUP_KIND,'current',setup);
      return reply({ setup });
    }
    if (data.action === 'rate') {
      const role = rater(req);
      if (!role) throw new StudyError('请输入评分者口令。',401);
      const id = typeof data.id === 'string' ? data.id : '';
      const match = /^(.*)-(round1|round2)$/.exec(id);
      const record = match && ID_PATTERN.test(match[1]) && repo.get<RecordState>(RECORD_KIND,match[1]);
      const step = match?.[2];
      if (!record || record.version === VERSION || record.mode === 'demo' || record.status === 'active' || !step || !drawingStep(step) || !record.artwork[step] || !record.ended[step] || record.ended[step]?.reason === 'exited') throw new StudyError('找不到评分作品。',404);
      const scores = data.scores;
      if (!Array.isArray(scores) || scores.length !== 3 || !scores.every(n => Number.isInteger(n) && n >= 1 && n <= 5)) throw new StudyError('请填写三项1至5分。');
      const rating = { scores, at:now, note:typeof data.note === 'string' ? data.note.slice(0,1600) : '' };
      repo.put(`expression-rating-${role}`,id,rating);
      return reply({ rating });
    }
    const existing = owner(repo,req);
    if (data.action === 'enroll') {
      if (existing?.status === 'active') {
        if (data.mode === existing.mode && (!existing.assignment || (
          typeof data.participantCode === 'string'
          && data.participantCode.trim().toUpperCase() === existing.assignment.code
          && data.group === existing.assignment.group
        ))) return reply({ record:existing, now });
        throw new StudyError('当前浏览器已有进行中的测试，请先完成该测试。',409);
      }
      const mode = data.mode;
      if (mode !== 'demo' && mode !== 'pilot' && mode !== 'formal') throw new StudyError('测试阶段无效。');
      if (mode !== 'demo' && process.env.NODE_ENV === 'production' && !constantEqual(data.enrollmentCode,process.env.STUDY_ENROLLMENT_CODE)) throw new StudyError('招募码不正确，请联系研究者。',403);
      const token = randomBytes(32).toString('hex');
      const record = enrollExpression(repo,data,mode,token,now);
      return cookie(reply({ record, now },201),req,participantCookie,token,365*24*60*60);
    }
    if (data.action === 'admin-delete') {
      if (!admin(repo,req)) throw new StudyError('请先登录研究后台。',401);
      if (typeof data.id !== 'string' || !ID_PATTERN.test(data.id)) throw new StudyError('记录编号无效。');
      removeExpression(repo,data.id);
      return reply({ ok:true });
    }
    if (!existing) throw new StudyError('请先确认知情同意并登记。',401);
    if (data.action === 'release') {
      if (existing.status === 'active') throw new StudyError('请先完成或退出本次测试。',409);
      const setup = setupFor(repo);
      return cookie(reply({ record:null, now, setup, setupSignature:hash(JSON.stringify(setup)) }),req,participantCookie,'',0);
    }
    if (data.action !== 'checkpoint' && data.action !== 'next' && data.action !== 'exit') throw new StudyError('测试操作无效。');
    return reply({ record:saveExpression(repo,existing.id,data,now), now });
  } catch (error) { return problem(error); }
}
