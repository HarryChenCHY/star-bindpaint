'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Brush,
  Check,
  CircleDot,
  Image as ImageIcon,
  Layers3,
  Moon,
  Palette,
  Route,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import { MASTER_ARTISTS, MasterArtist, Masterwork } from '@/lib/masterworks';
import { MASTER_STYLES } from '@/lib/style-transfer';
import { useAppSettings } from '@/contexts/AppContext';

type SourceMode = 'examples' | 'upload' | 'free';
type GuidanceLevel = 'full' | 'balanced' | 'light';
type PreparedSource = {
  kind: 'example' | 'upload';
  title: string;
  subtitle: string;
  preview: string;
};

const COLORS = {
  ink: '#17233F',
  inkSoft: '#536079',
  purple: '#6558D9',
  purpleSoft: '#ECEAFE',
  yellow: '#FFD166',
  mint: '#69D2C2',
  pink: '#FF8FAB',
  paper: '#F6F7FB',
  white: '#FFFFFF',
};

const GUIDANCE_OPTIONS: Array<{
  id: GuidanceLevel;
  title: string;
  body: string;
  badge: string;
}> = [
  { id: 'full', title: '完整引导', body: '显示起点、轨迹、方向和颜色', badge: '第一次画推荐' },
  { id: 'balanced', title: '适度引导', body: '显示起点与轨迹，保留更多判断', badge: '已有少量经验' },
  { id: 'light', title: '轻量提示', body: '仅提示结构顺序和起笔区域', badge: '想自主练习' },
];

const BRUSH_OPTIONS = [
  { value: 1, title: '细节更多', body: '更多小笔触，适合慢慢完成' },
  { value: 2, title: '均衡笔触', body: '结构和细节比较平衡' },
  { value: 3, title: '大笔概括', body: '更少、更大的笔触，较快完成' },
];

function cacheImage(img: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  const maxSize = 512;
  let width = img.naturalWidth;
  let height = img.naturalHeight;

  if (Math.max(width, height) > maxSize) {
    const scale = maxSize / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  sessionStorage.setItem('star-bindpaint-source', dataUrl);
  sessionStorage.setItem('star-bindpaint-source-w', String(width));
  sessionStorage.setItem('star-bindpaint-source-h', String(height));
  return dataUrl;
}

export default function CreatePage() {
  const router = useRouter();
  const { settings, hydrated } = useAppSettings();
  const [sourceMode, setSourceMode] = useState<SourceMode>('examples');
  const [preparedSource, setPreparedSource] = useState<PreparedSource | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [guidance, setGuidance] = useState<GuidanceLevel>('full');
  const [roughness, setRoughness] = useState(2);
  const [selectedFreeStyle, setSelectedFreeStyle] = useState('vangogh');

  useEffect(() => {
    if (hydrated) setGuidance(settings.defaultGuidance);
  }, [hydrated, settings.defaultGuidance]);

  const curatedWorks = useMemo(
    () => MASTER_ARTISTS.flatMap(artist => artist.works.slice(0, 2).map(work => ({ artist, work }))),
    [],
  );

  const resetPreparedSource = () => {
    setPreparedSource(null);
    setPrepareError('');
    sessionStorage.removeItem('star-bindpaint-source');
    sessionStorage.removeItem('star-bindpaint-master');
  };

  const changeMode = (mode: SourceMode) => {
    setSourceMode(mode);
    resetPreparedSource();
  };

  const handleSelectWork = (artist: MasterArtist, work: Masterwork) => {
    setPreparing(true);
    setPrepareError('');

    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        cacheImage(image);
        sessionStorage.setItem('star-bindpaint-master', JSON.stringify({
          id: work.id,
          title: work.title,
          artist: artist.name,
        }));
        sessionStorage.removeItem('star-bindpaint-free-style');
        setPreparedSource({
          kind: 'example',
          title: `《${work.title}》`,
          subtitle: `${artist.name} · ${work.year}`,
          preview: work.image,
        });
      } catch {
        setPrepareError('图片准备失败，请换一幅作品重试。');
      } finally {
        setPreparing(false);
      }
    };
    image.onerror = () => {
      setPreparing(false);
      setPrepareError('图片加载失败，请换一幅作品重试。');
    };
    image.src = work.image;
  };

  const handleImageUploaded = (image: HTMLImageElement) => {
    setPreparing(true);
    setPrepareError('');
    try {
      const dataUrl = cacheImage(image);
      sessionStorage.removeItem('star-bindpaint-master');
      sessionStorage.removeItem('star-bindpaint-free-style');
      setPreparedSource({
        kind: 'upload',
        title: '我的参考图片',
        subtitle: '已准备生成星迹',
        preview: dataUrl,
      });
    } catch {
      setPrepareError('图片处理失败，请尝试 JPG 或 PNG 图片。');
    } finally {
      setPreparing(false);
    }
  };

  const handleStartGuided = () => {
    if (!preparedSource) return;
    sessionStorage.setItem('star-bindpaint-roughness', String(roughness));
    sessionStorage.setItem('startrace-guidance-level', guidance);
    sessionStorage.setItem('startrace-entry-mode', preparedSource.kind);
    sessionStorage.removeItem('star-bindpaint-free-style');
    router.push('/paint');
  };

  const handleStartFree = () => {
    sessionStorage.setItem('star-bindpaint-free-style', selectedFreeStyle);
    sessionStorage.setItem('star-bindpaint-difficulty', 'free');
    sessionStorage.setItem('startrace-entry-mode', 'free');
    sessionStorage.setItem('startrace-guidance-level', guidance);
    sessionStorage.removeItem('star-bindpaint-source');
    sessionStorage.removeItem('star-bindpaint-master');
    router.push('/paint');
  };

  return (
    <div className="min-h-screen overflow-x-hidden pb-28" style={{ background: COLORS.paper, color: COLORS.ink }}>
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur" style={{ borderColor: '#D9DDEA' }}>
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm font-black">
            <ArrowLeft size={18} strokeWidth={2.8} />
            <span className="hidden sm:inline">返回首页</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: COLORS.yellow, border: `2px solid ${COLORS.ink}` }}>
              <Moon size={19} strokeWidth={2.6} />
            </span>
            <div>
              <p className="text-sm font-black tracking-[-0.03em]">开始一条新星迹</p>
              <p className="text-[9px] font-extrabold tracking-[0.14em]" style={{ color: COLORS.inkSoft }}>CREATE WITH STARTRACE</p>
            </div>
          </div>
          <button onClick={() => router.push('/intro')} className="hidden text-sm font-black sm:block" style={{ color: COLORS.purple }}>
            产品说明
          </button>
          <div className="w-[18px] sm:hidden" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <section className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black tracking-[0.1em]" style={{ background: COLORS.purpleSoft, color: COLORS.purple }}>
              <Sparkles size={15} strokeWidth={2.6} />
              第一步不是画得好，而是选一幅想画的
            </div>
            <h1 className="mt-6 max-w-4xl text-[clamp(2.7rem,6vw,5.4rem)] font-black leading-[0.98] tracking-[-0.06em]">
              今天想沿着哪条
              <span className="block" style={{ color: COLORS.purple }}>星迹开始？</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base font-bold leading-8" style={{ color: COLORS.inkSoft }}>
              选择一幅示例作品，或上传你真正想画的图片。系统会先拆解画面，再把复杂任务变成眼前的一笔。
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-extrabold" style={{ color: COLORS.inkSoft }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: COLORS.yellow, color: COLORS.ink }}>1</span>
            选画面
            <ArrowRight size={14} />
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">2</span>
            设引导
            <ArrowRight size={14} />
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">3</span>
            开始画
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="创作方式">
          {([
            ['examples', ImageIcon, '精选临摹', '零基础推荐'],
            ['upload', Upload, '上传图片', '画自己喜欢的'],
            ['free', Palette, '自由画布', '不使用拆解路径'],
          ] as const).map(([id, Icon, title, detail]) => {
            const active = sourceMode === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => changeMode(id)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-transform hover:-translate-y-0.5 sm:px-5"
                style={{
                  background: active ? COLORS.ink : COLORS.white,
                  color: active ? COLORS.white : COLORS.ink,
                  border: `2px solid ${COLORS.ink}`,
                  boxShadow: active ? `4px 4px 0 ${COLORS.yellow}` : 'none',
                }}
              >
                <Icon size={20} strokeWidth={2.5} />
                <span>
                  <span className="block text-sm font-black">{title}</span>
                  <span className="mt-0.5 block text-[10px] font-bold" style={{ color: active ? 'rgba(255,255,255,0.62)' : COLORS.inkSoft }}>{detail}</span>
                </span>
              </button>
            );
          })}
        </div>

        {sourceMode !== 'free' ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
            <section className="rounded-[2rem] bg-white p-5 sm:p-7" style={{ border: `2px solid ${COLORS.ink}` }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[0.12em]" style={{ color: COLORS.purple }}>
                    {sourceMode === 'examples' ? '选择参考画面' : '上传参考画面'}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                    {sourceMode === 'examples' ? '从适合拆解的作品开始' : '把喜欢的图片变成绘画步骤'}
                  </h2>
                </div>
                <span className="hidden rounded-full px-3 py-2 text-xs font-black sm:inline-flex" style={{ background: COLORS.yellow }}>
                  {sourceMode === 'examples' ? `${curatedWorks.length} 幅精选` : 'JPG / PNG'}
                </span>
              </div>

              {sourceMode === 'examples' ? (
                <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">
                  {curatedWorks.map(({ artist, work }) => {
                    const selected = preparedSource?.kind === 'example' && preparedSource.title === `《${work.title}》`;
                    return (
                      <motion.button
                        key={`${artist.id}-${work.id}`}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectWork(artist, work)}
                        className="overflow-hidden rounded-[1.4rem] text-left"
                        style={{
                          background: COLORS.white,
                          border: `2px solid ${selected ? COLORS.purple : COLORS.ink}`,
                          boxShadow: selected ? `5px 5px 0 ${COLORS.purple}` : `3px 3px 0 ${COLORS.ink}`,
                        }}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden" style={{ background: COLORS.paper }}>
                          <Image src={work.image} alt={work.title} fill sizes="(max-width: 768px) 50vw, 28vw" className="object-cover transition-transform duration-300 hover:scale-105" />
                          {selected && <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: COLORS.yellow, border: `2px solid ${COLORS.ink}` }}><Check size={17} strokeWidth={3} /></span>}
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-black">《{work.title}》</p>
                          <p className="mt-1 text-xs font-bold" style={{ color: COLORS.inkSoft }}>{artist.name} · {artist.style}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-7">
                  <ImageUploader onImageLoaded={handleImageUploaded} />
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      ['画面清晰', '主体轮廓越明确，星迹越容易跟随'],
                      ['内容适中', '第一次建议选择一个主体的画面'],
                      ['尊重隐私', '避免上传含敏感个人信息的图片'],
                    ].map(([title, body], index) => (
                      <div key={title} className="rounded-2xl p-4" style={{ background: [COLORS.yellow, '#E5F5F1', COLORS.purpleSoft][index] }}>
                        <p className="text-xs font-black">{title}</p>
                        <p className="mt-2 text-xs font-bold leading-5" style={{ color: COLORS.inkSoft }}>{body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preparing && <p className="mt-5 text-center text-sm font-black" style={{ color: COLORS.purple }}>正在准备图像与星迹数据…</p>}
              {prepareError && <p className="mt-5 rounded-xl px-4 py-3 text-sm font-bold" style={{ background: '#FFE3EC', color: '#9B2743' }}>{prepareError}</p>}
            </section>

            <aside className="rounded-[2rem] bg-white p-5 sm:p-6 lg:sticky lg:top-24" style={{ border: `2px solid ${COLORS.ink}`, boxShadow: `6px 6px 0 ${preparedSource ? COLORS.mint : '#D9DDEA'}` }}>
              {preparedSource ? (
                <>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl" style={{ border: `2px solid ${COLORS.ink}` }}>
                    <Image src={preparedSource.preview} alt={preparedSource.title} fill sizes="(max-width: 1024px) 100vw, 32vw" unoptimized={preparedSource.preview.startsWith('data:')} className="object-cover" />
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div><p className="text-base font-black">{preparedSource.title}</p><p className="mt-1 text-xs font-bold" style={{ color: COLORS.inkSoft }}>{preparedSource.subtitle}</p></div>
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full" style={{ background: COLORS.mint }}><Check size={17} strokeWidth={3} /></span>
                  </div>

                  <div className="my-6 h-px" style={{ background: '#D9DDEA' }} />
                  <p className="text-xs font-black tracking-[0.12em]" style={{ color: COLORS.purple }}>引导强度</p>
                  <div className="mt-3 space-y-2">
                    {GUIDANCE_OPTIONS.map(option => {
                      const selected = guidance === option.id;
                      return (
                        <button key={option.id} onClick={() => setGuidance(option.id)} className="w-full rounded-2xl p-3 text-left" style={{ background: selected ? COLORS.purpleSoft : COLORS.paper, border: `1.5px solid ${selected ? COLORS.purple : 'transparent'}` }}>
                          <div className="flex items-center justify-between gap-2"><span className="text-sm font-black">{option.title}</span>{selected && <CircleDot size={17} color={COLORS.purple} strokeWidth={3} />}</div>
                          <p className="mt-1 text-[11px] font-bold leading-5" style={{ color: COLORS.inkSoft }}>{option.body}</p>
                          {option.id === 'full' && <p className="mt-2 text-[10px] font-black" style={{ color: COLORS.purple }}>{option.badge}</p>}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-6 text-xs font-black tracking-[0.12em]" style={{ color: COLORS.purple }}>笔触颗粒度</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {BRUSH_OPTIONS.map(option => {
                      const selected = roughness === option.value;
                      return (
                        <button key={option.value} onClick={() => setRoughness(option.value)} className="rounded-xl p-3 text-center" title={option.body} style={{ background: selected ? COLORS.yellow : COLORS.paper, border: `1.5px solid ${selected ? COLORS.ink : 'transparent'}` }}>
                          <Brush className="mx-auto" size={18 + option.value * 2} strokeWidth={2.5} />
                          <span className="mt-2 block text-[10px] font-black leading-4">{option.title}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={handleStartGuided} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-black text-white" style={{ background: COLORS.ink, boxShadow: `4px 4px 0 ${COLORS.yellow}` }}>
                    生成星迹并开始 <ArrowRight size={18} strokeWidth={2.8} />
                  </button>
                </>
              ) : (
                <div className="flex min-h-[390px] flex-col items-center justify-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-[1.4rem]" style={{ background: COLORS.purpleSoft }}><Route size={30} color={COLORS.purple} strokeWidth={2.4} /></span>
                  <h3 className="mt-6 text-xl font-black">先选择一幅画面</h3>
                  <p className="mt-3 max-w-[240px] text-sm font-bold leading-6" style={{ color: COLORS.inkSoft }}>选好后，这里会出现引导强度和笔触设置。</p>
                  <div className="mt-7 flex items-center gap-2 text-xs font-black" style={{ color: COLORS.purple }}><CircleDot size={15} /> 星点 <ArrowRight size={14} /> <Route size={15} /> 星迹 <ArrowRight size={14} /> <Brush size={15} /> 动笔</div>
                </div>
              )}
            </aside>
          </div>
        ) : (
          <section className="mt-8 grid gap-7 rounded-[2rem] bg-white p-5 sm:p-8 lg:grid-cols-[1fr_0.72fr]" style={{ border: `2px solid ${COLORS.ink}` }}>
            <div>
              <p className="text-xs font-black tracking-[0.12em]" style={{ color: COLORS.purple }}>自由画布</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">不跟参考图，直接表达自己的想法</h2>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-7" style={{ color: COLORS.inkSoft }}>自由模式保留实时笔触风格化，但不生成星点和星迹，不作为笔触拆解研究的核心练习路径。</p>
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {MASTER_STYLES.map(style => {
                  const selected = selectedFreeStyle === style.id;
                  return (
                    <button key={style.id} onClick={() => setSelectedFreeStyle(style.id)} className="rounded-2xl p-4 text-left" style={{ background: selected ? `${style.color}22` : COLORS.paper, border: `2px solid ${selected ? style.color : 'transparent'}` }}>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: style.color }}><Wand2 size={18} color="white" /></span>
                      <p className="mt-5 text-sm font-black">{style.name}风格</p>
                      <p className="mt-1 text-[10px] font-bold leading-4" style={{ color: COLORS.inkSoft }}>{style.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <aside className="flex flex-col justify-between rounded-[1.6rem] p-6" style={{ background: COLORS.ink, color: COLORS.white }}>
              <div>
                <Palette size={32} color={COLORS.yellow} />
                <h3 className="mt-8 text-2xl font-black">一张空白画布</h3>
                <div className="mt-5 space-y-3 text-sm font-bold text-white/65">
                  <p className="flex gap-2"><Check size={17} color={COLORS.mint} /> 自主选择颜色和画笔</p>
                  <p className="flex gap-2"><Check size={17} color={COLORS.mint} /> 实时笔触风格化</p>
                  <p className="flex gap-2"><Check size={17} color={COLORS.mint} /> 完成后保存到星图</p>
                </div>
              </div>
              <button onClick={handleStartFree} className="mt-10 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-black" style={{ background: COLORS.yellow, color: COLORS.ink }}>
                打开自由画布 <ArrowRight size={18} strokeWidth={2.8} />
              </button>
            </aside>
          </section>
        )}

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            [Layers3, '先拆解', '系统先处理结构，不要求你先懂理论'],
            [CircleDot, '再落笔', '每次只关注当前这一颗星点'],
            [Route, '可退出', '熟悉以后逐渐减少轨迹辅助'],
          ].map(([Icon, title, body], index) => {
            const TipIcon = Icon as typeof Layers3;
            return (
              <div key={title as string} className="flex gap-4 rounded-2xl p-4" style={{ background: [COLORS.yellow, '#E5F5F1', COLORS.purpleSoft][index] }}>
                <TipIcon className="flex-none" size={22} strokeWidth={2.5} />
                <div><p className="text-sm font-black">{title as string}</p><p className="mt-1 text-xs font-bold leading-5" style={{ color: COLORS.inkSoft }}>{body as string}</p></div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
