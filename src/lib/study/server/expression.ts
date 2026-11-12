import { randomInt, randomUUID } from 'node:crypto';
import { hash, type StudyRepository } from './repository';
import {
  DEFAULT_SETUP, IMI, STEPS, SUS, VERSION, experienceQuestions,
  drawingStep, findStudyAssignment, limitFor, roundsFor, scoreSurveys, REST_MS, type DrawingStep, type Form,
  type Mode, type RecordState, type StudyEvent, type StudySetup,
} from '../expression';

export const RECORD_KIND = 'expression-record';
export const SETUP_KIND = 'expression-setup';
export const IDENTITY_KIND = 'expression-identity';
export const AUTH_KIND = 'expression-auth';
export const ID_PATTERN = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
export const EVENT_TYPES = ['manual_stroke','manual_undo','material_add','layout_confirmed','material_layout_confirmed','layout_open','auto_requested','auto_planning','auto_playing','auto_pause','auto_done','auto_error','help','browser_hidden','browser_visible','resume_snapshot','studio_reset'] as const;
export const savedPath = (id: string, file: string) => `expression/${id}/${file}`;
export const setupFor = (repo: StudyRepository) => repo.get<StudySetup>(SETUP_KIND, 'current') ?? DEFAULT_SETUP;
export class StudyError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export function input(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StudyError('提交格式有误。');
  return value as Record<string, unknown>;
}
function str(value: unknown, max: number) {
  if (typeof value !== 'string' || value.length > max) throw new StudyError('文字格式或长度有误。');
  return value.trim();
}
function completeConsent(setup: StudySetup) {
  return Boolean(setup.researcher && setup.contact && setup.ethics && setup.compensation);
}

export function setupFrom(value: unknown): StudySetup {
  const data = input(value);
  const { retentionDays } = data;
  if (typeof retentionDays !== 'number' || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) throw new StudyError('保存期限必须在1至3650天之间。');
  const setup: StudySetup = { researcher: str(data.researcher, 120), contact: str(data.contact, 200), ethics: str(data.ethics, 300), compensation: str(data.compensation, 300), retentionDays };
  if (!completeConsent(setup) || data.reviewConfirmed !== true)
    throw new StudyError('请填写真实研究信息，确认已取得适用的伦理审核决定。');
  return setup;
}
export function roundExperience(record: RecordState) {
  return ([0, 1] as const).map(index => {
    const drawing = index === 0 ? 'round1' : 'round2';
    const answers = record.forms[index === 0 ? 'survey1' : 'survey2'] ?? {};
    const condition = record.rounds[index];
    const events = record.events[drawing] ?? [];
    const confirmed = events.some(event => event.type === 'material_layout_confirmed');
    const canTell = record.version === VERSION && (events.length > 0 || Boolean(record.ended[drawing]));
    const outcome = (id: string) => typeof answers[id] === 'number' ? answers[id] : null;
    return {
      round: index + 1,
      ...condition,
      materialLayoutConfirmed: !condition.materials ? false : confirmed ? true : canTell ? false : null,
      expressionRealized: outcome('expressionRealized'),
      creativeControl: outcome('creativeControl'),
      interactionEffort: outcome('interactionEffort'),
      ...scoreSurveys(answers),
    };
  });
}

export function exportRecord(record: RecordState) {
  return {
    ...record,
    roundExperience: roundExperience(record),
    scores: [scoreSurveys(record.forms.survey1), scoreSurveys(record.forms.survey2)],
    scoring: 'IMI: 完整分量表均值，反向题以8减原分。SUS: 完整10项计分。跳答或缺答导致相应分数为null。',
  };
}
function persist(repo: StudyRepository, record: RecordState) {
  repo.write(savedPath(record.id, 'record.json'), JSON.stringify(exportRecord(record), null, 2));
  repo.put(RECORD_KIND, record.id, record);
}
export function enrollExpression(repo: StudyRepository, data: Record<string, unknown>, mode: Mode, token: string, now: number) {
  if (data.accepted !== true || data.version !== VERSION) throw new StudyError('请先阅读并确认当前版本的知情同意书。');
  const name = str(data.name, 80), experience = str(data.experience, 80), device = str(data.device, 80), gender = str(data.gender ?? '', 80);
  const age = data.age;
  if (!name || !experience || !device || typeof age !== 'number' || !Number.isInteger(age) || age < 18 || age > 120) throw new StudyError('请填写姓名、成年年龄、绘画经验和设备。');
  return repo.transaction(() => {
    const setup = mode === 'demo' ? DEFAULT_SETUP : setupFor(repo);
    if (mode !== 'demo') {
      if (data.setupSignature !== hash(JSON.stringify(setup))) throw new StudyError('同意书已更新，请刷新后重新阅读。', 409);
      if (process.env.NODE_ENV === 'production' && !completeConsent(setup)) throw new StudyError('请由研究者补齐知情同意书信息后再登记。', 409);
    }
    const group = data.group;
    if (group !== 'manual' && group !== 'auto') throw new StudyError('请选择研究者告知的绘制组别。');
    const assignment = mode === 'demo' ? undefined : findStudyAssignment(mode, str(data.participantCode, 16));
    if (mode !== 'demo') {
      if (!assignment) throw new StudyError('该编号不属于所选测试阶段，请核对研究者提供的编号。');
      if (assignment.group !== group) throw new StudyError('编号与绘制组别不一致，请核对分配信息。');
      const taken = repo.all<RecordState>(RECORD_KIND).some(record => record.assignment?.code === assignment.code);
      if (taken) throw new StudyError('该参与者编号已登记。请使用原浏览器继续，或联系研究者核对。', 409);
    }
    const id = randomUUID();
    const sequence = assignment?.sequence ?? randomInt(4) + (group === 'auto' ? 4 : 0);
    const record: RecordState = {
      id, mode, sequence, assignment, version: VERSION, status: 'active', step: 'intent', createdAt: now, updatedAt: now, enteredAt: now, revision: 0,
      consent: { acceptedAt: now, version: VERSION, config: setup },
      profile: { age, experience, device, gender }, rounds: roundsFor(sequence),
      forms: {}, events: {}, artwork: {}, reference: {}, layouts: {}, ended: {},
    };
    repo.put(AUTH_KIND, hash(token), { id });
    repo.put(IDENTITY_KIND, id, { name });
    repo.write(savedPath(id, 'identity.json'), JSON.stringify({ id, name }, null, 2));
    persist(repo, record);
    return record;
  });
}

function cleanForm(step: RecordState['step'], value: unknown, version: string): Form {
  const data = input(value);
  const questions = experienceQuestions(version);
  const keys = step === 'intent' ? ['a','b'] : step === 'plan1' || step === 'plan2' ? ['plan'] : step === 'interview' ? questions.interview.map(q => q.id) : [];
  if (step === 'survey1' || step === 'survey2') {
    return Object.fromEntries([...IMI, ...SUS, ...questions.outcomes].filter(q => Object.hasOwn(data,q.id)).map(q => {
      const answer = data[q.id];
      if (answer !== null && (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 1 || answer > q.max))
        throw new StudyError('问卷答案不在有效范围内。');
      return [q.id, answer];
    }));
  }
  return Object.fromEntries(keys.filter(key => Object.hasOwn(data,key)).map(key => [key, str(data[key], 1600)]));
}

function jpeg(value: unknown): Buffer {
  const prefix = 'data:image/jpeg;base64,';
  if (typeof value !== 'string' || !value.startsWith(prefix) || value.length > 550_000) throw new StudyError('作品须为有效的JPEG画布。');
  const bytes = Buffer.from(value.slice(prefix.length), 'base64');
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
    throw new StudyError('作品JPEG格式无效。');
  // The browser exports a fixed 640×480 canvas. Check the frame before storing it.
  for (let i = 2; i + 9 < bytes.length;) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1], size = bytes.readUInt16BE(i + 2);
    if (size < 2 || i + 2 + size > bytes.length) break;
    if (marker === 0xc0 || marker === 0xc2) {
      if (size < 8 || bytes.readUInt16BE(i + 5) !== 480 || bytes.readUInt16BE(i + 7) !== 640) break;
      return bytes;
    }
    i += 2 + size;
  }
  throw new StudyError('作品JPEG尺寸无效。');
}

export function saveExpression(repo: StudyRepository, id: string, data: Record<string, unknown>, now: number) {
  return repo.transaction(() => {
    const record = repo.get<RecordState>(RECORD_KIND, id);
    if (!record) throw new StudyError('找不到本次测试。', 404);
    if (record.status !== 'active') return record;
    if (data.step !== record.step || data.revision !== record.revision) throw new StudyError('测试进度已更新，请刷新页面恢复。', 409);
    const { step } = record;
    const next = data.action === 'next';
    const exit = data.action === 'exit';
    const timedOut = drawingStep(step) && now >= record.enteredAt + limitFor(step);
    if (data.form !== undefined) record.forms[step] = cleanForm(step, data.form, record.version);
    const form = record.forms[step] ?? {};
    if (next) {
      if (step === 'intent' && (!form.a || !form.b)) throw new StudyError('请先分别写下两张照片的初始想法。');
      if (step === 'rest') {
        const elapsedMs = Math.max(0, now - record.enteredAt);
        record.rest = { elapsedMs, endedEarly: elapsedMs < REST_MS };
      }
    }
    if (data.events !== undefined) {
      if (!Array.isArray(data.events) || data.events.length > 2000) throw new StudyError('操作记录格式有误。');
      const entries = data.events.map(item => {
        const e = input(item);
        if (!EVENT_TYPES.some(type => type === e.type) || typeof e.at !== 'number' || !Number.isFinite(e.at)) throw new StudyError('操作记录格式有误。');
        return { type: e.type as string, at: Math.max(record.enteredAt, Math.min(now, e.at)), ...(typeof e.detail === 'string' ? { detail: e.detail.slice(0, 200) } : {}) } satisfies StudyEvent;
      });
      record.events[step] = [...(record.events[step] ?? []), ...entries].slice(0, 12000);
    }
    if (drawingStep(step)) {
      if (data.layout !== undefined) record.layouts[step] = str(data.layout, 32_000);
      const drafts=record.draftArtwork ??= {};
      const reset = Array.isArray(data.events) && data.events.some(event => input(event).type === 'studio_reset');
      if (reset && data.layout === undefined) delete record.layouts[step];
      const images = [
        { name: step, map: record.artwork, value: data.image ?? (reset ? null : undefined) },
        { name: `${step}-reference`, map: record.reference, value: data.reference === undefined && reset ? null : data.reference },
        { name: `${step}-draft`, map: drafts, value: data.draftImage === undefined && reset ? null : data.draftImage },
      ].filter(item => item.value !== undefined).map(item => ({ ...item, bytes: item.value === null ? null : jpeg(item.value) }));
      for (const { name, map, bytes } of images) {
        if (!bytes) {
          if (map[step]) {
            repo.remove(savedPath(id, `${name}.jpg`));
            delete map[step];
          }
          continue;
        }
        const sha256 = hash(bytes);
        if (map[step]?.sha256 === sha256) continue;
        repo.write(savedPath(id, `${name}.jpg`), bytes);
        map[step] = { at: now, sha256, bytes: bytes.length };
      }
      if (next || exit || timedOut) {
        record.ended[step] = { at: now, reason: exit ? 'exited' : timedOut ? 'timeout' : 'submitted', elapsedMs: Math.min(limitFor(step), Math.max(0, now - record.enteredAt)) };
      }
    }
    if (exit) record.status = 'exited';
    else if (next || timedOut) {
      record.step = STEPS[STEPS.indexOf(step)+1];
      record.enteredAt = now;
      if (record.step === 'done') record.status = 'completed';
    }
    record.updatedAt = now;
    record.revision++;
    persist(repo, record);
    return record;
  });
}

export function removeExpression(repo: StudyRepository, id: string) {
  repo.transaction(() => {
    repo.remove(savedPath(id, ''));
    repo.delete(RECORD_KIND, id);
    repo.delete(IDENTITY_KIND, id);
    const rows = repo.db.prepare('SELECT id FROM records WHERE kind=? AND json_extract(data,\'$.id\')=?').all(AUTH_KIND, id);
    for (const row of rows) repo.delete(AUTH_KIND, String(row.id));
    for (const role of [1,2]) for (const round of ['round1','round2']) repo.delete(`expression-rating-${role}`, `${id}-${round}`);
  });
}

export function isDrawingFile(value: string): value is DrawingStep {
  return drawingStep(value);
}
