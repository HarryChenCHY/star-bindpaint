'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAppSettings } from '@/contexts/AppContext';
import EmotionPicker, { Emotion } from '@/components/EmotionPicker';
import SocialStory from '@/components/SocialStory';
import MasterQuoteCard from '@/components/MasterQuoteCard';
import Stepper, { Step } from '@/components/Stepper';
import { StarChar, FlowerChar, BlobChar } from '@/components/Characters';

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
  const [emotion, setEmotion] = useState<string>('');
  const [energy, setEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [showStory, setShowStory] = useState(false);
  const [bgImage, setBgImage] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const seen = localStorage.getItem('star-bindpaint-story-seen');
    if (!seen) setShowStory(true);
    setBgImage(BG_PAINTINGS[Math.floor(Math.random() * BG_PAINTINGS.length)]);
  }, []);

  const handleStoryComplete = () => setShowStory(false);

  const handleStart = () => {
    let roughness = 2;
    let maxStrokes = 80;
    if (energy === 'low') {
      roughness = 4;
      maxStrokes = 25;
    } else if (energy === 'high') {
      roughness = 1;
      maxStrokes = 200;
    }

    if (emotion === 'anxious' || emotion === 'sad') {
      roughness = Math.min(4, roughness + 1);
    }

    updateSettings({ emotionBefore: emotion, energy });
    sessionStorage.setItem('star-bindpaint-roughness', String(roughness));
    sessionStorage.setItem('star-bindpaint-max-strokes', String(maxStrokes));
    sessionStorage.setItem('star-bindpaint-emotion-before', emotion);

    router.push('/create');
  };

  const energyOptions = [
    { id: 'low' as const, label: '小能量', desc: '画 3 分钟', icon: '🌱', strokes: '15-25 笔', color: '#7DC353' },
    { id: 'medium' as const, label: '中能量', desc: '画 5 分钟', icon: '🌿', strokes: '40-80 笔', color: '#F9B801' },
    { id: 'high' as const, label: '大能量', desc: '画 10 分钟', icon: '🌳', strokes: '100+ 笔', color: '#F302C9' },
  ];

  // 第 2 步必须选过情绪才允许下一步；第 1/3 步随时可继续
  const canGoNext = currentStep === 2 ? Boolean(emotion) : true;

  return (
    <div className="flex-1 flex flex-col min-h-screen relative" data-calm={settings.calmMode}>
      {bgImage && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img src={bgImage} alt="" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(2px)' }}
          />
        </div>
      )}

      {showStory && <SocialStory onComplete={handleStoryComplete} />}

      <header
        className="relative z-10 flex items-center justify-between px-3 sm:px-8 py-3 sm:py-5 gap-2"
        style={{
          borderBottom: '2px solid #1A1A1A',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{ fontWeight: 800, fontSize: 'clamp(0.8rem, 2.4vw, 0.9rem)', color: '#1A1A1A' }}
        >
          ← 返回
        </button>
        <span className="truncate" style={{ fontWeight: 900, fontSize: 'clamp(0.85rem, 2.8vw, 1rem)', color: '#1A1A1A', letterSpacing: '-0.02em' }}>
          {settings.childName ? `${settings.childName}，` : ''}准备画画
        </span>
        <button
          onClick={() => router.push('/settings')}
          style={{ fontWeight: 800, fontSize: 'clamp(0.78rem, 2.2vw, 0.85rem)', color: '#1A1A1A' }}
        >
          设置
        </button>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10 max-w-md mx-auto w-full">
        <Stepper
          initialStep={1}
          onStepChange={setCurrentStep}
          onFinalStepCompleted={handleStart}
          backButtonText="上一步"
          nextButtonText="继续"
          completeButtonText="开始画画 🎨"
          canGoNext={canGoNext}
        >
          {/* === STEP 1 — 欢迎 === */}
          <Step>
            <div className="flex flex-col items-center text-center pt-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
                className="flex items-end gap-2 mb-5"
              >
                <div className="animate-float" style={{ animationDelay: '0s' }}>
                  <StarChar size={70} />
                </div>
                <div className="animate-float" style={{ animationDelay: '-1.2s' }}>
                  <FlowerChar size={60} />
                </div>
                <div className="animate-float" style={{ animationDelay: '-2.4s' }}>
                  <BlobChar size={56} />
                </div>
              </motion.div>
              <h2
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: '#1A1A1A',
                  letterSpacing: '-0.03em',
                  marginBottom: '0.6rem',
                  lineHeight: 1.1,
                }}
              >
                你好<span style={{ color: '#7A51EC' }}>，</span>艺术家！
              </h2>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#666',
                  fontWeight: 600,
                  lineHeight: 1.6,
                  maxWidth: '280px',
                }}
              >
                我们一起花几分钟，找到今天最适合你的画画方式
              </p>
            </div>
          </Step>

          {/* === STEP 2 — 情绪 === */}
          <Step>
            <div className="pt-2">
              <EmotionPicker
                selected={emotion}
                onSelect={(e: Emotion) => setEmotion(e)}
                label="今天感觉怎么样？"
              />
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
              {!emotion && (
                <p
                  className="text-center mt-4"
                  style={{ fontSize: '0.8rem', color: '#AAA', fontWeight: 600 }}
                >
                  选一个最贴近的就好
                </p>
              )}
            </div>
          </Step>

          {/* === STEP 3 — 能量 === */}
          <Step>
            <div className="pt-2">
              <p
                className="text-center mb-4"
                style={{
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: '#1A1A1A',
                  letterSpacing: '-0.02em',
                }}
              >
                今天有多少热情想放进画里？
              </p>
              <div className="flex flex-col gap-3 px-2">
                {energyOptions.map((opt, i) => {
                  const isSelected = energy === opt.id;
                  const tilt = i % 2 === 0 ? -1.5 : 1.5;
                  return (
                    <motion.button
                      key={opt.id}
                      onClick={() => setEnergy(opt.id)}
                      initial={false}
                      animate={{ scale: isSelected ? 1.02 : 1 }}
                      whileHover={{ rotate: tilt, y: -2, scale: isSelected ? 1.04 : 1.02 }}
                      whileTap={{ scale: 0.97, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                      className="flex items-center gap-4 p-4 rounded-2xl text-left"
                      style={{
                        border: '2px solid #1A1A1A',
                        background: isSelected ? opt.color : '#FFFFFF',
                        boxShadow: isSelected ? '5px 5px 0 #1A1A1A' : '3px 3px 0 #1A1A1A',
                        position: 'relative',
                      }}
                    >
                      <span className="text-2xl" style={{ lineHeight: 1 }}>{opt.icon}</span>
                      <div>
                        <span
                          style={{
                            fontWeight: 900,
                            fontSize: '1rem',
                            color: isSelected ? '#FFFFFF' : '#1A1A1A',
                            letterSpacing: '-0.02em',
                            textShadow: isSelected ? '1px 1px 0 rgba(0,0,0,0.25)' : 'none',
                          }}
                        >
                          {opt.label}
                        </span>
                        <p
                          style={{
                            fontSize: '0.78rem',
                            color: isSelected ? 'rgba(255,255,255,0.95)' : '#888',
                            fontWeight: 700,
                          }}
                        >
                          {opt.desc}（{opt.strokes}）
                        </p>
                      </div>
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 10,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#1A1A1A',
                            color: '#FFFFFF',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                          }}
                        >
                          ✓
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              <MasterQuoteCard variant="compact" className="mt-5" />
            </div>
          </Step>
        </Stepper>
      </div>
    </div>
  );
}
