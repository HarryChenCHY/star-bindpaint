import { randomUUID } from 'node:crypto';
import {
  CAPABILITIES,
  CONSENT_SECTIONS,
  IMI_QUESTIONS,
  INTERVIEW,
  OUTCOME_QUESTIONS,
  PRE_QUESTIONS,
  PROTOCOL,
  SUS_QUESTIONS,
} from '../protocol';
import { STROKE_CONFIG } from '../../stroke-config';
import { config } from './service';
import { hash, type StudyRepository } from './repository';

/** Configuration-only package. Never includes credentials or participant records. */
export function createHandoff(repo: StudyRepository, studyId: string) {
  const c = config(repo, studyId);
  if (!c.material || !c.plan) throw new Error('请先保存材料与笔触计划，再生成交接包');
  const materialHash = hash(Buffer.from(c.material.split(',')[1] || '', 'base64'));
  const planHash = hash(JSON.stringify(c.plan));
  if (materialHash !== c.materialHash || planHash !== c.planHash) throw new Error('材料或计划哈希不一致，请核对存储后重试');
  const protocolMatches = c.protocolVersion === PROTOCOL.version;
  const governanceComplete = Object.values(c.governance).every(value => value.trim().length >= 2);
  const status = !protocolMatches || !c.published || !c.materialReviewed || !governanceComplete ? 'draft' : c.stage === 'pilot' ? 'published-pilot' : 'published-formal';
  const protocol = { ...PROTOCOL, consentSections: CONSENT_SECTIONS,
    questionnaires: { pre: PRE_QUESTIONS, outcomes: OUTCOME_QUESTIONS, imi: IMI_QUESTIONS, sus: SUS_QUESTIONS },
    interview: INTERVIEW, capabilities: CAPABILITIES,
    rubric: c.rubric, essentialItems: c.essentialItems };
  const id = randomUUID(), createdAt = new Date().toISOString();
  const bundle = { schemaVersion: 1, kind: 'study-handoff', id, createdAt, status,
    study: { id: c.id, stage: c.stage, published: c.published, materialReviewed: c.materialReviewed,
      savedProtocolVersion: c.protocolVersion, protocolMatches, governanceComplete, governance: c.governance },
    runtimeAlgorithm: STROKE_CONFIG, materialAlgorithmVersion: c.plan.version,
    protocol, material: { imagePng: c.material, plan: c.plan },
    manifest: { materialHash, planHash, protocolHash: hash(JSON.stringify(protocol)),
      plannedStrokes: c.plan.strokes.length, width: c.plan.width, height: c.plan.height },
    instructions: ['本文件是配置与材料快照，导出不改变发布状态。',
      '草稿不能作为正式研究冻结证明；已发布状态只描述导出时的系统配置。',
      '实际执行前核对材料、评分标准、设备和预试结论；当前算法与材料所用算法版本可能不同。',
      '保留原始 JSON 字节以核对外部 SHA-256；导入和覆盖历史研究需另行明确执行。',
      '本包不含参与者记录、实际作品或口令，不替代研究数据备份。'] };
  const path = `handoffs/${id}.json`, sha256 = repo.write(path, JSON.stringify(bundle, null, 2));
  const item = { id, studyId: c.id, path, createdAt, status, sha256, planHash };
  repo.put('handoff', id, item); repo.audit('handoff_export', c.id, { id, sha256, status, planHash });
  return item;
}
