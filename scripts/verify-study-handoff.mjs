import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [file, expected] = process.argv.slice(2);
if (!file) throw new Error('用法：node scripts/verify-study-handoff.mjs <交接包.json> [后台显示的SHA256]');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(file), sha256 = hash(bytes), data = JSON.parse(bytes);
if (expected && (!/^[a-f0-9]{64}$/i.test(expected) || sha256 !== expected.toLowerCase())) throw new Error('外部 SHA-256 不一致');
if (data.kind !== 'study-handoff' || data.schemaVersion !== 1 || !data.material?.imagePng?.startsWith('data:image/png;base64,') || !data.material.plan || !data.protocol || !data.manifest) throw new Error('交接包结构无效');
const checks = {
  materialHash: hash(Buffer.from(data.material.imagePng.split(',')[1], 'base64')),
  planHash: hash(JSON.stringify(data.material.plan)),
  protocolHash: hash(JSON.stringify(data.protocol)),
};
for (const [key, value] of Object.entries(checks)) if (data.manifest[key] !== value) throw new Error(`${key} 校验失败`);
if (data.manifest.plannedStrokes !== data.material.plan.strokes.length || data.manifest.width !== data.material.plan.width || data.manifest.height !== data.material.plan.height) throw new Error('材料计划清单不一致');
console.log(JSON.stringify({ valid: true, externalHashChecked: !!expected, sha256, studyId: data.study.id, status: data.status, materialAlgorithm: data.materialAlgorithmVersion, strokes: data.manifest.plannedStrokes }, null, 2));
