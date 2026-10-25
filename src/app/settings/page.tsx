'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Brush, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useAppSettings } from '@/contexts/AppContext';
import {
  clearLocalStarTraceData,
  loadPrivacyPreferences,
  type PrivacyPreferences,
} from '@/lib/privacy-settings';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useAppSettings();
  const [privacy] = useState<PrivacyPreferences>(() => loadPrivacyPreferences());
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const deleteAllData = async () => {
    const confirmed = window.confirm('这会删除当前浏览器中的作品、练习记录和偏好；若你已同意研究，也会申请删除对应匿名云端记录。此操作无法撤销，是否继续？');
    if (!confirmed) return;
    setDeleting(true);
    setNotice('');
    try {
      if (privacy.participantId) {
        const response = await fetch('/api/analytics', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: privacy.participantId, confirm: true }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || '云端删除申请失败');
      }
      clearLocalStarTraceData();
      setNotice('当前浏览器数据已删除。');
      window.setTimeout(() => window.location.assign('/'), 700);
    } catch (error) {
      setNotice(error instanceof Error ? `${error.message}；本地数据尚未删除，请稍后重试。` : '删除失败，请稍后重试。');
    } finally {
      setDeleting(false);
    }
  };

  return <div className="night-page">
    <header className="night-header"><button type="button" onClick={() => router.push('/')}><ArrowLeft size={18} />返回首页</button><span className="night-muted">设置与隐私</span></header>
    <main className="night-settings">
      <p className="night-eyebrow">YOUR SPACE</p><h1 className="mt-3 text-3xl">让创作更自在</h1>
      <section className="night-card">
        <Brush size={24} className="mb-4 text-[var(--st-primary)]" /><h2>绘画体验</h2><p>这些偏好只保存在当前浏览器。</p>
        <div className="night-setting-row"><div><h3>减少动态效果</h3><p>减少装饰动画，保留必要的笔触演示。</p></div>
          <button type="button" role="switch" aria-label="减少动态效果" aria-checked={settings.reducedMotion} onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })} className="night-switch"><span /></button>
        </div>
      </section>
      <section className="night-card"><ShieldCheck size={24} className="mb-4 text-[var(--st-primary)]" /><h2>作品留在你的浏览器</h2><p>自由画布与 AI 共创在浏览器内处理图片和素材，不上传照片或作品。下载图片可保留独立副本，清理浏览器数据会影响本地收藏。</p>
        <div className="night-setting-row"><div className="flex-1"><h3>删除我的数据</h3><p>删除本地作品、练习、偏好及匿名编号，并申请删除与该编号关联的研究记录和云端作品。此操作不可撤销。</p></div>
          <button type="button" disabled={deleting} onClick={deleteAllData} className="night-danger shrink-0 disabled:opacity-50"><Trash2 size={18} />{deleting ? '正在删除…' : '删除全部数据'}</button>
        </div>
        {notice && <p className="mt-4" role="status">{notice}</p>}
      </section>
      <section className="night-card"><div className="flex items-center gap-3"><Sparkles size={20} className="text-[var(--st-primary)]" /><h3>数据使用边界</h3></div><p className="mt-3">当前创作过程不收集研究数据。若你曾参与旧版研究，删除全部数据时会同时申请删除与原匿名编号关联的云端记录。</p></section>
    </main>
  </div>;
}
