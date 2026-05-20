'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAppSettings } from '@/contexts/AppContext';
import EmotionPicker, { Emotion } from '@/components/EmotionPicker';
import SocialStory from '@/components/SocialStory';
import MasterQuoteCard from '@/components/MasterQuoteCard';

// 用于背景的大师画作（随机选一幅）
const BG_PAINTINGS = [
  '/masterworks/monet/water_lilies_1918.jpg',
  '/masterworks/monet/impression_sunrise.jpg',
  '/masterworks/vangogh/starry_night.jpg',
  '/masterworks/monet/water_lilies_sunset.jpg',
  '/masterworks/sargent/willows.jpg',
];

export default function OnboardPage() {
  const router = useRouter();
  const { settings, updateSettings } = useAppSettings();
  const [step, setStep] = useState<'story' | 'emotion' | 'energy'>('emotion');
  const [emotion, setEmotion] = useState<string>('');
  const [energy, setEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [showStory, setShowStory] = useState(false);
  const [bgImage, setBgImage] = useState('');

  // 首次进入检查是否需要社交故事
  useEffect(() => {
    const seen = localStorage.getItem('star-bindpaint-story-seen');
    if (!seen) {
      setShowStory(true);
      setStep('story');
    }
    // 随机选一幅背景画
    setBgImage(BG_PAINTINGS[Math.floor(Math.random() * BG_PAINTINGS.length)]);
  }, []);

  const handleStoryComplete = () => {
    setShowStory(false);
    setStep('emotion');
  };

  const handleStart = () => {
    // 根据情绪+能量自动调整参数
    let roughness = 2;
    let maxStrokes = 80;
    if (energy === 'low') { roughness = 4; maxStrokes = 25; }
    else if (energy === 'high') { roughness = 1; maxStrokes = 200; }

    if (emotion === 'anxious' || emotion === 'sad') {
      // 紧张/难过时降低难度
      roughness = Math.min(4, roughness + 1);
    }

    // 存入 session
    updateSettings({ emotionBefore: emotion, energy });
    sessionStorage.setItem('star-bindpaint-roughness', String(roughness));
    sessionStorage.setItem('star-bindpaint-max-strokes', String(maxStrokes));
    sessionStorage.setItem('star-bindpaint-emotion-before', emotion);

    router.push('/create');
  };

  const energyOptions = [
    { id: 'low' as const, label: '小能量', desc: '画 3 分钟', icon: '🌱', strokes: '15-25 笔' },
    { id: 'medium' as const, label: '中能量', desc: '画 5 分钟', icon: '🌿', strokes: '40-80 笔' },
    { id: 'high' as const, label: '大能量', desc: '画 10 分钟', icon: '🌳', strokes: '100+ 笔' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen relative" data-calm={settings.calmMode}>
      {/* 大师画作背景 */}
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(2px)' }} />
        </div>
      )}

      {/* 社交故事 */}
      {showStory && <SocialStory onComplete={handleStoryComplete} />}

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5" style={{ borderBottom: '2px solid #E5E5E5', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.push('/')} style={{ fontWeight: 800, fontSize: '0.9rem', color: '#888' }}>
          ← 返回
        </button>
        <span style={{ fontWeight: 900, fontSize: '1rem', color: '#1A1A1A' }}>
          {settings.childName ? `${settings.childName}，` : ''}准备画画
        </span>
        <button onClick={() => router.push('/settings')} style={{ fontWeight: 700, fontSize: '0.8rem', color: '#888' }}>
          设置
        </button>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10 gap-10 max-w-md mx-auto w-full">
        {/* 情绪选择 */}
        {step === 'emotion' && !showStory && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <EmotionPicker
              selected={emotion}
              onSelect={(e: Emotion) => {
                setEmotion(e);
                setTimeout(() => setStep('energy'), 800);
              }}
              label="今天感觉怎么样？"
            />
            {/* 选择心情后的温暖反馈 */}
            {emotion && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-4"
                style={{ fontSize: '0.9rem', fontWeight: 600, color: '#666' }}
              >
                {emotion === 'happy' && '太好了！开心的时候画画特别棒 ☀️'}
                {emotion === 'calm' && '平静的心情很适合慢慢画~ ☁️'}
                {emotion === 'anxious' && '没关系，画画可以帮你放松 🌿'}
                {emotion === 'sad' && '抱抱你，让颜色陪伴你 💙'}
              </motion.p>
            )}
            <button
              onClick={() => setStep('energy')}
              className="mt-6 mx-auto block"
              style={{ color: '#BBB', fontWeight: 600, fontSize: '0.85rem' }}
            >
              不想选，直接开始 →
            </button>
          </motion.div>
        )}

        {/* 能量选择 */}
        {step === 'energy' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <p className="text-center mb-4" style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A1A' }}>
              今天有多少热情想放进画里？
            </p>
            <div className="flex flex-col gap-3">
              {energyOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setEnergy(opt.id)}
                  className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                  style={{
                    border: energy === opt.id ? '3px solid #7A51EC' : '2px solid #E5E5E5',
                    background: energy === opt.id ? '#7A51EC08' : 'white',
                  }}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1A1A1A' }}>{opt.label}</span>
                    <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>{opt.desc}（{opt.strokes}）</p>
                  </div>
                </button>
              ))}
            </div>

            {/* 开始按钮 */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 flex justify-center">
              <button onClick={handleStart} className="btn-black" style={{ padding: '1em 3em', fontSize: '1.1rem' }}>
                开始画画 →
              </button>
            </motion.div>

            {/* 大师名言 */}
            <MasterQuoteCard variant="compact" className="mt-6" />

            {/* 返回情绪选择 */}
            <button
              onClick={() => setStep('emotion')}
              className="mt-4 mx-auto block"
              style={{ color: '#BBB', fontWeight: 600, fontSize: '0.8rem' }}
            >
              ← 重新选择心情
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
