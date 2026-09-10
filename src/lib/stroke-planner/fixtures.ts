export interface MaterialFixture {
  id: string;
  title: string;
  group: 'simple' | 'boundary' | 'complex';
  source: string;
  inspect: string;
}
const svg = (body: string, width = 320, height = 320, transparent = false) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 320 320">${transparent ? '' : '<rect width="320" height="320" fill="white"/>'}${body}</svg>`,
  );
const house =
  '<path d="M70 150L160 65L250 150Z" fill="#c86c53"/><path d="M90 150H230V260H90Z" fill="#e8c785"/><path d="M140 200H180V260H140Z" fill="#71594b"/><path d="M105 170H130V197H105ZM190 170H215V197H190Z" fill="#87b7cd"/>';
const boat =
  '<path d="M45 228H275L240 271H85Z" fill="#c07752"/><path d="M160 225V52" stroke="#37495c" stroke-width="6"/><path d="M151 70L151 208H65Z" fill="#edc065"/><path d="M172 106L249 208H172Z" fill="#8fb3c7"/><path d="M25 283H295" stroke="#749cba" stroke-width="8"/>';
const flower =
  '<path d="M160 258V140" stroke="#54875b" stroke-width="9"/><ellipse cx="138" cy="210" rx="27" ry="13" fill="#7ba269"/><ellipse cx="184" cy="187" rx="27" ry="13" fill="#7ba269"/><g fill="#d5899a"><ellipse cx="160" cy="96" rx="23" ry="40"/><ellipse cx="124" cy="126" rx="40" ry="23"/><ellipse cx="192" cy="126" rx="40" ry="23"/><ellipse cx="160" cy="155" rx="23" ry="32"/></g><circle cx="160" cy="126" r="23" fill="#e8bf64"/>';
const mountains =
  '<circle cx="249" cy="76" r="25" fill="#edc065"/><path d="M24 240L115 100L199 240Z" fill="#839e8a"/><path d="M116 240L220 124L300 240Z" fill="#59847c"/><path d="M22 252H300" stroke="#87b7cd" stroke-width="18"/>';
const texture = Array.from(
  { length: 400 },
  (_, i) =>
    `<rect x="${(i % 20) * 16}" y="${Math.floor(i / 20) * 16}" width="16" height="16" fill="${['#567c71', '#d8a365', '#869faf', '#b06b72', '#ead8a8'][((i * 17) ^ (i >> 2)) % 5]}"/>`,
).join('');
const confetti = Array.from(
  { length: 140 },
  (_, i) =>
    `<circle cx="${(i * 53 + 17) % 320}" cy="${(i * 97 + 29) % 320}" r="${2 + (i % 6)}" fill="${['#cf8455', '#608c67', '#678faa', '#d1b467'][i % 4]}"/>`,
).join('');
export const MATERIAL_FIXTURES: MaterialFixture[] = [
  {
    id: 'plant',
    title: '盆栽（当前候选）',
    group: 'simple',
    source: '/study/plant.svg',
    inspect: '三片叶、主茎、盆口、花盆及桌面是否保留；细茎是否连通。',
  },
  {
    id: 'cup',
    title: '杯子（练习候选）',
    group: 'simple',
    source: '/study/practice.svg',
    inspect: '杯身、杯口和把手是否可辨认；不要直接沿用盆栽评分清单。',
  },
  {
    id: 'house',
    title: '小屋',
    group: 'simple',
    source: svg(house),
    inspect: '屋顶、门和两扇窗是否保留；边界是否清楚。',
  },
  {
    id: 'boat',
    title: '帆船',
    group: 'simple',
    source: svg(boat),
    inspect: '桅杆、两片帆、船体和水线是否完整。',
  },
  {
    id: 'flower',
    title: '花朵',
    group: 'simple',
    source: svg(flower),
    inspect: '花心、花瓣、两片叶与茎的连接是否自然。',
  },
  {
    id: 'mountains',
    title: '山景',
    group: 'simple',
    source: svg(mountains),
    inspect: '两座山的前后关系、太阳和水线是否保留。',
  },
  {
    id: 'thin',
    title: '细长结构',
    group: 'boundary',
    source: svg(
      '<path d="M160 280V65M160 150L105 100M160 197L210 146" stroke="#568460" stroke-width="3"/><circle cx="160" cy="55" r="22" fill="#d7ad62"/>',
    ),
    inspect: '3 像素细茎可能被区域简化抹除；必须单独核对连接。',
  },
  {
    id: 'landscape',
    title: '横向画幅',
    group: 'boundary',
    source: svg(boat, 480, 240),
    inspect: '横向比例、桅杆和帆的位置；不允许拉伸参考图。',
  },
  {
    id: 'transparent',
    title: '透明背景与竖幅',
    group: 'boundary',
    source: svg(flower, 240, 400, true),
    inspect: '透明背景应合成白色；花朵不能变形或出现黑底。',
  },
  {
    id: 'texture',
    title: '密集纹理',
    group: 'complex',
    source: svg(texture),
    inspect: '生成成功也不等于保真；核对简化程度，必要时拒绝作为正式材料。',
  },
  {
    id: 'confetti',
    title: '大量零碎区域',
    group: 'complex',
    source: svg(confetti),
    inspect: '小区域消失情况及描画负担；不把大量碎点当作适合新手的任务。',
  },
  {
    id: 'busy-background',
    title: '复杂背景中的小屋',
    group: 'complex',
    source: svg(
      texture +
        '<rect x="50" y="40" width="220" height="250" fill="#fff" opacity=".75"/>' +
        house,
    ),
    inspect: '主体是否仍突出；背景简化是否改变整体目标。',
  },
];
