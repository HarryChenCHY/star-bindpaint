'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSettings } from '@/contexts/AppContext';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useAppSettings();
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const PARENT_PIN = '1234'; // 简单密码保护

  if (!unlocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 gap-6">
        <h1 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1A1A1A' }}>家长/治疗师设置</h1>
        <p style={{ color: '#888', fontWeight: 600, fontSize: '0.9rem' }}>请输入密码（默认 1234）</p>
        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value)}
          className="text-center text-2xl tracking-widest p-3 rounded-xl w-40"
          style={{ border: '2px solid #1A1A1A', fontWeight: 800 }}
          placeholder="····"
        />
        <button
          onClick={() => { if (pin === PARENT_PIN) setUnlocked(true); }}
          className="btn-black"
        >
          进入设置
        </button>
        <button onClick={() => router.back()} style={{ color: '#888', fontWeight: 700, fontSize: '0.85rem' }}>
          ← 返回
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen">
      <header className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '2px solid #1A1A1A' }}>
        <button onClick={() => router.push('/')} style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>
          ← 返回首页
        </button>
        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A' }}>家长设置</span>
        <div style={{ width: 80 }} />
      </header>

      <div className="max-w-md mx-auto w-full px-6 py-10 flex flex-col gap-8">
        {/* 孩子名字 */}
        <div>
          <label style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A', display: 'block', marginBottom: 8 }}>
            孩子的名字
          </label>
          <input
            type="text"
            value={settings.childName}
            onChange={e => updateSettings({ childName: e.target.value })}
            className="w-full p-3 rounded-xl"
            style={{ border: '2px solid #E5E5E5', fontWeight: 600, fontSize: '1rem' }}
            placeholder="输入名字"
          />
        </div>

        {/* 难度等级 */}
        <div>
          <label style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A', display: 'block', marginBottom: 8 }}>
            难度等级
          </label>
          <div className="flex flex-col gap-2">
            {[
              { level: 1 as const, name: '小小画家', desc: '任何触碰都算完成，15-25笔，无失败', color: '#7DC353' },
              { level: 2 as const, name: '小画家', desc: '宽松匹配，40-80笔，3次后自动跳过', color: '#F9B801' },
              { level: 3 as const, name: '小艺术家', desc: '标准匹配，全部笔触，提示重试', color: '#7A51EC' },
            ].map(d => (
              <button
                key={d.level}
                onClick={() => updateSettings({ difficulty: d.level })}
                className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                style={{
                  border: settings.difficulty === d.level ? `3px solid ${d.color}` : '2px solid #E5E5E5',
                  background: settings.difficulty === d.level ? `${d.color}10` : 'white',
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: d.color }}>
                  {d.level}
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1A1A1A' }}>{d.name}</span>
                  <p style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, marginTop: 2 }}>{d.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 安静模式 */}
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: '2px solid #E5E5E5' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>安静模式</span>
            <p style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, marginTop: 2 }}>低刺激界面，减少动画和色彩</p>
          </div>
          <button
            onClick={() => updateSettings({ calmMode: !settings.calmMode })}
            className="w-12 h-7 rounded-full transition-all relative"
            style={{ background: settings.calmMode ? '#7BA7CC' : '#E5E5E5' }}
          >
            <div
              className="w-5 h-5 rounded-full bg-white absolute top-1 transition-all"
              style={{ left: settings.calmMode ? '26px' : '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
            />
          </button>
        </div>

        {/* 先看后做 */}
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: '2px solid #E5E5E5' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>先看后做</span>
            <p style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, marginTop: 2 }}>每笔先演示一遍再让孩子画</p>
          </div>
          <button
            onClick={() => updateSettings({ watchBeforeDo: !settings.watchBeforeDo })}
            className="w-12 h-7 rounded-full transition-all relative"
            style={{ background: settings.watchBeforeDo ? '#7BA7CC' : '#E5E5E5' }}
          >
            <div
              className="w-5 h-5 rounded-full bg-white absolute top-1 transition-all"
              style={{ left: settings.watchBeforeDo ? '26px' : '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
