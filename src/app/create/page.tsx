'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarrySprite from '@/components/StarrySprite';
import ImageUploader from '@/components/ImageUploader';
import { MiniStar } from '@/components/Characters';
import { MASTER_ARTISTS, MOOD_OPTIONS, MasterArtist, Masterwork } from '@/lib/masterworks';
import { MASTER_DIALOGUES } from '@/lib/master-dialogues';
import { MASTER_STYLES } from '@/lib/style-transfer';
import MasterBubble from '@/components/MasterBubble';

type SourceMode = 'masters' | 'upload' | 'free';

export default function CreatePage() {
  const router = useRouter();
  const [sourceMode, setSourceMode] = useState<SourceMode>('masters');
  const [selectedArtist, setSelectedArtist] = useState<MasterArtist | null>(null);
  const [selectedWork, setSelectedWork] = useState<Masterwork | null>(null);
  const [selectedMood, setSelectedMood] = useState('original');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [roughness, setRoughness] = useState(2);
  const [dialogueMsg, setDialogueMsg] = useState('');
  const [bgImage, setBgImage] = useState('/masterworks/monet/water_lilies_1918.jpg');
  const [selectedFreeStyle, setSelectedFreeStyle] = useState('vangogh');

  // 选择大师作品后加载图片到 sessionStorage
  const handleSelectWork = (artist: MasterArtist, work: Masterwork) => {
    setSelectedWork(work);
    setSelectedArtist(artist);
    setBgImage(work.image);

    // 设置鼓励语
    const d = MASTER_DIALOGUES[artist.id];
    if (d) {
      const enc = d.encouragements[Math.floor(Math.random() * d.encouragements.length)];
      setDialogueMsg(enc);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 512;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (Math.max(w, h) > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      sessionStorage.setItem('star-bindpaint-source', canvas.toDataURL('image/jpeg', 0.9));
      sessionStorage.setItem('star-bindpaint-source-w', String(w));
      sessionStorage.setItem('star-bindpaint-source-h', String(h));
      sessionStorage.setItem('star-bindpaint-master', JSON.stringify({
        id: work.id,
        title: work.title,
        artist: artist.name,
      }));
      setImageLoaded(true);
    };
    img.src = work.image;
  };

  // 用户上传自己的图片
  const handleImageUploaded = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    const maxSize = 512;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (Math.max(w, h) > maxSize) {
      const scale = maxSize / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    sessionStorage.setItem('star-bindpaint-source', canvas.toDataURL('image/jpeg', 0.9));
    sessionStorage.setItem('star-bindpaint-source-w', String(w));
    sessionStorage.setItem('star-bindpaint-source-h', String(h));
    sessionStorage.removeItem('star-bindpaint-master');
    setSelectedArtist(null);
    setSelectedWork(null);
    setImageLoaded(true);
  };

  const handleStart = () => {
    sessionStorage.setItem('star-bindpaint-roughness', String(roughness));
    sessionStorage.setItem('star-bindpaint-mood', selectedMood);
    sessionStorage.removeItem('star-bindpaint-free-style');
    router.push('/paint');
  };

  const handleStartFree = () => {
    sessionStorage.setItem('star-bindpaint-free-style', selectedFreeStyle);
    sessionStorage.removeItem('star-bindpaint-source');
    router.push('/paint');
  };

  const roughnessLabels = ['很多很多笔 🐢', '不多不少 🌿', '大大的笔触 🎨', '超大笔刷 🖌️'];
  const ready = imageLoaded;

  // 情绪色调对应的 CSS 滤镜（实时预览用）
  function getMoodFilter(mood: string): string {
    switch (mood) {
      case 'warm': return 'sepia(0.2) saturate(1.2) hue-rotate(-10deg)';
      case 'calm': return 'saturate(0.8) brightness(1.05) hue-rotate(15deg)';
      case 'vivid': return 'saturate(1.5)';
      case 'dreamy': return 'saturate(0.7) brightness(1.15) hue-rotate(20deg)';
      default: return 'none';
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen relative">
      {/* 大师画作背景 */}
      <div className="absolute inset-0 z-0 transition-all duration-700">
        <img src={bgImage} alt="" className="w-full h-full object-cover transition-all duration-700" />
        <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(2px)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5" style={{ borderBottom: '2px solid #1A1A1A', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.push('/')} className="flex items-center gap-2"
          style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>
          ← 返回首页
        </button>
        <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
          选择画作
        </span>
        <div style={{ width: '80px' }} />
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full">

        {/* Source mode tabs */}
        <div className="flex gap-2 mb-8 justify-center flex-wrap">
          <button
            onClick={() => { setSourceMode('masters'); setImageLoaded(false); setSelectedWork(null); }}
            className="px-5 py-2.5 rounded-full text-sm transition-all"
            style={{
              fontWeight: 800,
              background: sourceMode === 'masters' ? '#1A1A1A' : '#F5F5F5',
              color: sourceMode === 'masters' ? '#FFFFFF' : '#1A1A1A',
              border: '2px solid #1A1A1A',
            }}
          >
            大师作品库
          </button>
          <button
            onClick={() => { setSourceMode('free'); setImageLoaded(false); setSelectedWork(null); }}
            className="px-5 py-2.5 rounded-full text-sm transition-all"
            style={{
              fontWeight: 800,
              background: sourceMode === 'free' ? '#7A51EC' : '#F5F5F5',
              color: sourceMode === 'free' ? '#FFFFFF' : '#1A1A1A',
              border: `2px solid ${sourceMode === 'free' ? '#7A51EC' : '#1A1A1A'}`,
            }}
          >
            自由创作
          </button>
          <button
            onClick={() => { setSourceMode('upload'); setImageLoaded(false); setSelectedWork(null); }}
            className="px-5 py-2.5 rounded-full text-sm transition-all"
            style={{
              fontWeight: 800,
              background: sourceMode === 'upload' ? '#1A1A1A' : '#F5F5F5',
              color: sourceMode === 'upload' ? '#FFFFFF' : '#1A1A1A',
              border: '2px solid #1A1A1A',
            }}
          >
            上传图片
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ===== 大师作品库 ===== */}
          {sourceMode === 'masters' && (
            <motion.div key="masters" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

              {/* 未选画家：展示画家列表 */}
              {!selectedArtist && (
                <div>
                  <p className="text-center mb-6" style={{ color: '#888', fontWeight: 700, fontSize: '0.95rem' }}>
                    选择一位大师，临摹他的经典作品，与他进行心灵对话
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {MASTER_ARTISTS.map((artist) => (
                      <motion.button
                        key={artist.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setSelectedArtist(artist);
                          setBgImage(artist.works[0].image);
                          const d = MASTER_DIALOGUES[artist.id];
                          if (d) setDialogueMsg(d.greetings[Math.floor(Math.random() * d.greetings.length)]);
                        }}
                        className="rounded-[1.5rem] overflow-hidden text-left transition-all relative"
                        style={{ border: '2px solid #1A1A1A', minHeight: '180px' }}
                      >
                        {/* 底图：第一张画作 */}
                        <div className="absolute inset-0">
                          <img
                            src={artist.works[0].image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)' }} />
                        </div>

                        {/* 内容 */}
                        <div className="relative p-4 flex flex-col justify-end h-full" style={{ minHeight: '180px' }}>
                          {/* 头像 */}
                          <div className="absolute top-3 right-3 w-12 h-12 rounded-full overflow-hidden" style={{ border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                            <img
                              src={`/master/${artist.id}/image.png`}
                              alt={artist.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                            {artist.name}
                          </h3>
                          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '2px' }}>
                            {artist.nameEn}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: '4px' }}>
                            {artist.style} · {artist.period}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* 已选画家：展示该画家的作品 */}
              {selectedArtist && !selectedWork && (
                <div>
                  <button
                    onClick={() => { setSelectedArtist(null); setDialogueMsg(''); }}
                    style={{ fontWeight: 800, fontSize: '0.85rem', color: '#888', marginBottom: '16px' }}
                  >
                    ← 返回画家列表
                  </button>

                  {/* 大师对话气泡 */}
                  <MasterBubble
                    artistId={selectedArtist.id}
                    artistName={selectedArtist.name}
                    message={dialogueMsg}
                    quote={MASTER_DIALOGUES[selectedArtist.id]?.quote}
                    className="mb-6"
                  />

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: selectedArtist.color }}>
                      <span className="text-white text-xl font-bold">{selectedArtist.name[0]}</span>
                    </div>
                    <div>
                      <h2 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#1A1A1A', letterSpacing: '-0.03em' }}>
                        {selectedArtist.name}的作品
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>{selectedArtist.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedArtist.works.map((work) => (
                      <motion.button
                        key={work.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelectWork(selectedArtist, work)}
                        onMouseEnter={() => {
                          // hover 时切换为该画的创作故事
                          const story = MASTER_DIALOGUES[selectedArtist.id]?.workStories[work.id];
                          if (story) setDialogueMsg(story);
                        }}
                        className="rounded-[1.25rem] overflow-hidden text-left"
                        style={{ border: '2px solid #1A1A1A' }}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                          <img src={work.image} alt={work.title}
                            className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="p-3">
                          <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>{work.title}</h4>
                          <p style={{ fontSize: '0.7rem', color: '#AAA', fontWeight: 600 }}>{work.titleEn} · {work.year}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* 已选作品：显示预览 + 进入下一步 */}
              {selectedWork && (
                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={() => { setSelectedWork(null); setImageLoaded(false); setDialogueMsg(MASTER_DIALOGUES[selectedArtist!.id]?.greetings[0] || ''); }}
                    style={{ fontWeight: 800, fontSize: '0.85rem', color: '#888', alignSelf: 'flex-start' }}
                  >
                    ← 换一幅画
                  </button>

                  {/* 大师鼓励语 */}
                  <MasterBubble
                    artistId={selectedArtist!.id}
                    artistName={selectedArtist!.name}
                    message={dialogueMsg}
                    className="w-full"
                  />

                  <div className="rounded-[1.5rem] overflow-hidden max-w-sm w-full" style={{ border: '2px solid #1A1A1A' }}>
                    <img
                      src={selectedWork.image}
                      alt={selectedWork.title}
                      className="w-full transition-all duration-500"
                      style={{ filter: getMoodFilter(selectedMood) }}
                    />
                    <div className="p-4 bg-white">
                      <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#1A1A1A' }}>
                        {selectedArtist?.name} ·《{selectedWork.title}》
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>
                        {selectedWork.titleEn}, {selectedWork.year}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== 上传模式 ===== */}
          {sourceMode === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center gap-6">
              <p style={{ color: '#888', fontWeight: 700, fontSize: '0.95rem' }}>
                上传你自己的图片，AI 将分析并生成笔触
              </p>
              <ImageUploader onImageLoaded={handleImageUploaded} />
            </motion.div>
          )}

          {/* ===== 自由创作模式 ===== */}
          {sourceMode === 'free' && (
            <motion.div key="free" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6">
              <div className="text-center">
                <h3 style={{ fontWeight: 900, fontSize: '1.3rem', color: '#1A1A1A', marginBottom: 8 }}>
                  自由画，AI 实时变成油画
                </h3>
                <p style={{ color: '#888', fontWeight: 600, fontSize: '0.9rem', maxWidth: 400 }}>
                  画任何你想画的内容，每一笔都会被实时转化为大师的油画风格
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-xl">
                {MASTER_STYLES.map(style => {
                  // 找到对应画家的第一张作品作为背景
                  const artist = MASTER_ARTISTS.find(a => a.id === style.id);
                  const bgWork = artist?.works[0]?.image || '';
                  return (
                    <motion.button
                      key={style.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedFreeStyle(style.id)}
                      className="rounded-[1.5rem] overflow-hidden text-left relative"
                      style={{
                        border: selectedFreeStyle === style.id ? `3px solid ${style.color}` : '2px solid #1A1A1A',
                        minHeight: '180px',
                        boxShadow: selectedFreeStyle === style.id ? `0 4px 20px ${style.color}40` : 'none',
                      }}
                    >
                      {/* 画作背景 */}
                      <div className="absolute inset-0">
                        {bgWork && <img src={bgWork} alt="" className="w-full h-full object-cover" />}
                        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, ${style.color}30 50%, rgba(0,0,0,0.2) 100%)` }} />
                      </div>

                      {/* 选中标记 */}
                      {selectedFreeStyle === style.id && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: style.color }}>
                          <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>
                        </div>
                      )}

                      {/* 头像 */}
                      <div className="absolute top-3 right-3 w-10 h-10 rounded-full overflow-hidden" style={{ border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        <img
                          src={`/master/${style.id}/image.png`}
                          alt={style.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 文字内容 */}
                      <div className="relative p-4 flex flex-col justify-end h-full" style={{ minHeight: '160px' }}>
                        <h4 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#FFFFFF' }}>
                          {style.name}风格
                        </h4>
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                          {style.nameEn} Style
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: '4px', lineHeight: 1.3 }}>
                          {style.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <button onClick={handleStartFree} className="btn-black mt-4"
                style={{ fontSize: '1.1rem', padding: '1em 3em' }}>
                开始自由创作 →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== 情绪色调选择（图片准备好后显示）===== */}
        {ready && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-[1.5rem]" style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#1A1A1A', marginBottom: '12px' }}>
              选择情绪色调
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, marginBottom: '16px' }}>
              为这幅画选择一种情绪氛围，让你的创作独一无二
            </p>
            <div className="flex gap-2 flex-wrap">
              {MOOD_OPTIONS.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className="px-4 py-2 rounded-full text-sm transition-all"
                  style={{
                    fontWeight: 700,
                    background: selectedMood === mood.id ? mood.color : 'white',
                    color: selectedMood === mood.id ? 'white' : '#1A1A1A',
                    border: `2px solid ${selectedMood === mood.id ? mood.color : '#E5E5E5'}`,
                  }}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== 笔触密度（图片准备好后显示）===== */}
        {ready && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mt-4 p-6 rounded-[1.5rem]" style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}>
            <div className="flex items-center justify-between mb-4">
              <label style={{ fontWeight: 800, fontSize: '1rem', color: '#1A1A1A' }}>🖌️ 笔画大小</label>
              <span className="rounded-full px-3 py-1" style={{ background: '#F9B801', fontSize: '0.75rem', fontWeight: 800, color: '#1A1A1A' }}>
                {roughnessLabels[roughness - 1]}
              </span>
            </div>
            <input type="range" min="1" max="4" step="1" value={roughness}
              onChange={e => setRoughness(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none"
              style={{ accentColor: '#7A51EC', background: '#DDD' }} />
            <div className="flex justify-between mt-2">
              {['细细的', '刚刚好', '大一点', '超大的'].map(l => (
                <span key={l} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#AAA' }}>{l}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== 开始按钮 ===== */}
        {ready && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex justify-center mt-8 mb-12">
            <button onClick={handleStart} className="btn-black"
              style={{ fontSize: '1.1rem', padding: '1em 3em' }}>
              开始创作 →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
