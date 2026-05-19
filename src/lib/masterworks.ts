/**
 * masterworks.ts — 大师作品图片库配置
 */

export interface Masterwork {
  id: string;
  title: string;
  titleEn: string;
  year: string;
  image: string;  // public/ 相对路径
}

export interface MasterArtist {
  id: string;
  name: string;
  nameEn: string;
  period: string;
  style: string;
  color: string;       // 代表色
  description: string;
  works: Masterwork[];
}

export const MASTER_ARTISTS: MasterArtist[] = [
  {
    id: 'monet',
    name: '莫奈',
    nameEn: 'Claude Monet',
    period: '1840-1926',
    style: '印象派',
    color: '#4A90D9',
    description: '光与色彩的诗人，用笔触捕捉瞬间的光影变化',
    works: [
      { id: 'impression_sunrise', title: '日出·印象', titleEn: 'Impression, Sunrise', year: '1872', image: '/masterworks/monet/impression_sunrise.jpg' },
      { id: 'water_lilies_1918', title: '睡莲', titleEn: 'Water Lilies', year: '1918', image: '/masterworks/monet/water_lilies_1918.jpg' },
      { id: 'water_lilies_sunset', title: '睡莲·日落', titleEn: 'Water Lilies, Setting Sun', year: '1920', image: '/masterworks/monet/water_lilies_sunset.jpg' },
      { id: 'houses_of_parliament', title: '议会大厦', titleEn: 'Houses of Parliament', year: '1900', image: '/masterworks/monet/houses_of_parliament.jpg' },
      { id: 'poppy_field', title: '罂粟花田', titleEn: 'Poppy Field', year: '1886', image: '/masterworks/monet/poppy_field.jpg' },
    ],
  },
  {
    id: 'vangogh',
    name: '梵高',
    nameEn: 'Vincent van Gogh',
    period: '1853-1890',
    style: '后印象派',
    color: '#F59E0B',
    description: '用旋转的笔触表达内心炽热的情感世界',
    works: [
      { id: 'starry_night', title: '星空', titleEn: 'The Starry Night', year: '1889', image: '/masterworks/vangogh/starry_night.jpg' },
      { id: 'bedroom_in_arles', title: '阿尔的卧室', titleEn: 'Bedroom in Arles', year: '1889', image: '/masterworks/vangogh/bedroom_in_arles.jpg' },
      { id: 'wild_roses', title: '野玫瑰', titleEn: 'Wild Roses', year: '1890', image: '/masterworks/vangogh/wild_roses.jpg' },
      { id: 'windmills_montmartre', title: '蒙马特的风车', titleEn: 'Windmills on Montmartre', year: '1886', image: '/masterworks/vangogh/windmills_montmartre.jpg' },
      { id: 'woman_in_garden', title: '花园中的女人', titleEn: 'Woman in a Garden', year: '1887', image: '/masterworks/vangogh/woman_in_garden.jpg' },
    ],
  },
  {
    id: 'gauguin',
    name: '高更',
    nameEn: 'Paul Gauguin',
    period: '1848-1903',
    style: '后印象派',
    color: '#E85D04',
    description: '逃离文明寻找原始之美，用大面积色块构建梦幻世界',
    works: [
      { id: 'breton_village', title: '布列塔尼村庄', titleEn: 'The Field of Derout-Lollichon', year: '1886', image: '/masterworks/gauguin/breton_village.jpg' },
      { id: 'washerwomen_arles', title: '阿尔的洗衣妇', titleEn: 'Washerwomen at Arles', year: '1888', image: '/masterworks/gauguin/washerwomen_arles.jpg' },
      { id: 'landscape_pouldu', title: '勒普尔杜的风景', titleEn: 'Landscape at Le Pouldu', year: '1890', image: '/masterworks/gauguin/landscape_pouldu.jpg' },
      { id: 'flower_still_life', title: '花卉静物', titleEn: 'Still Life with Flowers', year: '1884', image: '/masterworks/gauguin/flower_still_life.jpg' },
      { id: 'martinique', title: '马提尼克的来去', titleEn: 'Coming and Going, Martinique', year: '1887', image: '/masterworks/gauguin/martinique.jpg' },
    ],
  },
  {
    id: 'rembrandt',
    name: '伦勃朗',
    nameEn: 'Rembrandt',
    period: '1606-1669',
    style: '巴洛克',
    color: '#8B6914',
    description: '光影大师，用明暗对比揭示人物内心深处的灵魂',
    works: [
      { id: 'self_portrait', title: '自画像', titleEn: 'Self Portrait', year: '1659', image: '/masterworks/rembrandt/self_portrait.jpg' },
      { id: 'night_watch', title: '夜巡', titleEn: 'The Night Watch', year: '1642', image: '/masterworks/rembrandt/night_watch.jpg' },
      { id: 'anatomy_lesson', title: '犹太新娘', titleEn: 'The Jewish Bride', year: '1667', image: '/masterworks/rembrandt/anatomy_lesson.jpg' },
      { id: 'storm_on_galilee', title: '沐浴中的女子', titleEn: 'A Woman Bathing', year: '1654', image: '/masterworks/rembrandt/storm_on_galilee.jpg' },
      { id: 'return_of_prodigal', title: '浪子回头', titleEn: 'Return of the Prodigal Son', year: '1669', image: '/masterworks/rembrandt/return_of_prodigal.jpg' },
    ],
  },
  {
    id: 'picasso',
    name: '毕加索',
    nameEn: 'Pablo Picasso',
    period: '1881-1973',
    style: '立体主义',
    color: '#7C3AED',
    description: '打碎现实重新拼贴，用几何形体创造全新的观看方式',
    works: [
      { id: 'weeping_woman', title: '花篮女孩', titleEn: 'Girl with a Basket of Flowers', year: '1905', image: '/masterworks/picasso/weeping_woman.jpg' },
      { id: 'guernica_study', title: '老吉他手', titleEn: 'The Old Guitarist', year: '1904', image: '/masterworks/picasso/guernica_study.jpg' },
      { id: 'the_dream', title: '梦', titleEn: 'The Dream', year: '1932', image: '/masterworks/picasso/the_dream.jpg' },
      { id: 'girl_before_mirror', title: '镜前少女', titleEn: 'Girl Before a Mirror', year: '1932', image: '/masterworks/picasso/girl_before_mirror.jpg' },
      { id: 'three_musicians', title: '三个音乐家', titleEn: 'Three Musicians', year: '1921', image: '/masterworks/picasso/three_musicians.jpg' },
    ],
  },
  {
    id: 'sargent',
    name: '萨金特',
    nameEn: 'John Singer Sargent',
    period: '1856-1925',
    style: '写实主义/水彩',
    color: '#2E8B57',
    description: '笔触潇洒的肖像大师，水彩画中光影流转自如',
    works: [
      { id: 'venetian_canal', title: '威尼斯运河', titleEn: 'Venetian Canal', year: '1913', image: '/masterworks/sargent/venetian_canal.jpg' },
      { id: 'carnation_lily', title: '康乃馨与百合', titleEn: 'Carnation, Lily, Lily, Rose', year: '1886', image: '/masterworks/sargent/carnation_lily.jpg' },
      { id: 'madame_x', title: 'X 夫人', titleEn: 'Madame X', year: '1884', image: '/masterworks/sargent/madame_x.jpg' },
      { id: 'garden_study', title: '花园习作', titleEn: 'Garden Study', year: '1908', image: '/masterworks/sargent/garden_study.jpg' },
      { id: 'white_ships', title: '白帆', titleEn: 'White Ships', year: '1908', image: '/masterworks/sargent/white_ships.jpg' },
    ],
  },
];

/** 所有情绪色调选项 */
export const MOOD_OPTIONS = [
  { id: 'warm', label: '温暖', color: '#F59E0B', description: '偏暖色调，让画面更温馨' },
  { id: 'calm', label: '安静', color: '#4A90D9', description: '偏冷蓝调，带来平静感' },
  { id: 'vivid', label: '鲜活', color: '#10B981', description: '高饱和度，充满生命力' },
  { id: 'dreamy', label: '梦幻', color: '#A78BFA', description: '柔和紫粉调，如梦似幻' },
  { id: 'original', label: '原色', color: '#666666', description: '保持作品原始色调' },
];
