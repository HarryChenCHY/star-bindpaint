'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Brush, Cloud, Database, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useAppSettings } from '@/contexts/AppContext';
import {
  clearLocalStarTraceData,
  loadPrivacyPreferences,
  updatePrivacyPreferences,
  type PrivacyPreferences,
} from '@/lib/privacy-settings';

const GUIDANCE_OPTIONS = [
  { value: 'full' as const, name: '完整星迹', desc: '显示路径、起点和方向，适合第一次使用', color: '#69D2C2' },
  { value: 'balanced' as const, name: '平衡星迹', desc: '保留关键星点，减少画面提示', color: '#FFD166' },
  { value: 'light' as const, name: '轻量星迹', desc: '只在需要时提示，适合独立练习', color: '#B8ADF3' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useAppSettings();
  const [privacy, setPrivacy] = useState<PrivacyPreferences>(() => loadPrivacyPreferences());
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => setPrivacy(loadPrivacyPreferences()), []);

  const updatePrivacy = (patch: Partial<Pick<PrivacyPreferences, 'researchConsent' | 'artworkCloudUpload'>>) => {
    setPrivacy(updatePrivacyPreferences(patch));
    setNotice('设置已保存在当前浏览器。');
  };

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

  return (
    <main className="min-h-screen bg-[#F6F7FB] px-4 pb-28 pt-5 sm:px-8 sm:pt-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between rounded-[1.6rem] border-2 border-[#17233F] bg-white px-4 py-3 shadow-[5px_5px_0_#FFD166] sm:px-6">
          <button type="button" onClick={() => router.push('/')} className="flex items-center gap-2 text-sm font-black text-[#17233F]"><ArrowLeft size={17} /> 返回首页</button>
          <div className="text-right"><p className="text-[10px] font-black tracking-[0.14em] text-[#6558D9]">YOUR CONTROLS</p><h1 className="text-lg font-black text-[#17233F]">设置与隐私</h1></div>
        </header>

        <section className="mt-6 rounded-[1.7rem] border-2 border-[#17233F] bg-white p-5 shadow-[6px_6px_0_#69D2C2] sm:p-7">
          <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#17233F] bg-[#E4F7F2]"><Brush size={21} strokeWidth={2.8} /></span><div><p className="text-[10px] font-black tracking-[0.12em] text-[#13786B]">DRAWING PREFERENCES</p><h2 className="mt-1 text-xl font-black text-[#17233F]">默认绘画体验</h2><p className="mt-1 text-xs font-bold leading-5 text-[#65708A]">这些偏好只保存在当前浏览器，可以随时更改。</p></div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {GUIDANCE_OPTIONS.map(option => (
              <button key={option.value} type="button" onClick={() => updateSettings({ defaultGuidance: option.value })} className="rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5" style={{ border: settings.defaultGuidance === option.value ? '3px solid #17233F' : '2px solid #C8CEDA', background: settings.defaultGuidance === option.value ? option.color : '#FFFFFF', boxShadow: settings.defaultGuidance === option.value ? '4px 4px 0 #17233F' : 'none' }}>
                <span className="text-sm font-black text-[#17233F]">{option.name}</span><p className="mt-2 text-[11px] font-bold leading-5 text-[#4D5870]">{option.desc}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ToggleCard title="减少动态效果" description="减少装饰动画，保留必要的笔触演示。" checked={settings.reducedMotion} onChange={checked => updateSettings({ reducedMotion: checked })} />
            <ToggleCard title="AI 生成前再次确认" description="发送画布生成风格版本前显示用途提醒。" checked={settings.confirmBeforeAi} onChange={checked => updateSettings({ confirmBeforeAi: checked })} />
          </div>
        </section>

        <section className="mt-6 rounded-[1.7rem] border-2 border-[#17233F] bg-white p-5 shadow-[6px_6px_0_#B8ADF3] sm:p-7">
          <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#17233F] bg-[#ECEAFE]"><ShieldCheck size={21} strokeWidth={2.8} /></span><div><p className="text-[10px] font-black tracking-[0.12em] text-[#6558D9]">PRIVACY & RESEARCH</p><h2 className="mt-1 text-xl font-black text-[#17233F]">由你决定是否参与</h2><p className="mt-1 text-xs font-bold leading-5 text-[#65708A]">两项授权默认关闭、彼此独立。关闭不会影响临摹、自由画布和本地画廊。</p></div></div>
          <div className="mt-5 space-y-3">
            <ConsentCard icon={Database} color="#E4F7F2" title="匿名研究数据" description="允许记录会话时长、首次动笔时间、亲手/AI 笔触数量、引导等级和完成状态。不会上传姓名、原图、作品图片、笔触坐标或颜色。" checked={privacy.researchConsent} onChange={checked => updatePrivacy({ researchConsent: checked })} />
            <ConsentCard icon={Cloud} color="#FFF7D9" title="作品云端保存" description="允许将完成作品保存为云端链接，以减少浏览器本地空间占用。关闭时作品只保存在当前浏览器；主动点击 AI 风格生成时，当前画布仍需临时发送给生成服务。" checked={privacy.artworkCloudUpload} onChange={checked => updatePrivacy({ artworkCloudUpload: checked })} />
          </div>
          {privacy.researchConsent && privacy.participantId && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-[#9EA7B9] bg-[#F6F7FB] p-4"><p className="text-[10px] font-black tracking-[0.1em] text-[#65708A]">匿名参与编号</p><p className="mt-1 break-all font-mono text-xs font-bold text-[#17233F]">{privacy.participantId}</p><p className="mt-2 text-[10px] font-bold leading-4 text-[#8E98AD]">该编号随机生成，只用于关联同一浏览器的研究会话，不要求填写身份信息。</p></div>
          )}
          <p className="mt-4 text-[10px] font-bold leading-5 text-[#8E98AD]">正式研究开始前，研究人员仍需提供包含负责人、保存期限、风险与退出方式的完整知情同意书；本页开关不替代伦理审查流程。</p>
          <div className="mt-5 rounded-2xl border-2 border-[#17233F] bg-[#FFF0F5] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div><div className="flex items-center gap-2"><Trash2 size={17} /><h3 className="text-sm font-black text-[#17233F]">删除我的数据</h3></div><p className="mt-2 text-[11px] font-bold leading-5 text-[#65708A]">删除当前浏览器中的作品、练习、偏好及匿名编号，并申请删除与该编号关联的研究记录和云端作品。</p></div>
            <button type="button" disabled={deleting} onClick={deleteAllData} className="mt-3 w-full shrink-0 rounded-full border-2 border-[#17233F] bg-white px-5 py-2.5 text-xs font-black text-[#A61E55] shadow-[3px_3px_0_#FF8FAB] disabled:opacity-50 sm:mt-0 sm:w-auto">{deleting ? '正在删除…' : '删除全部数据'}</button>
          </div>
          {notice && <p className="mt-4 text-center text-xs font-black text-[#4D5870]">{notice}</p>}
        </section>

        <section className="mt-6 rounded-[1.5rem] border-2 border-[#17233F] bg-[#17233F] p-5 text-white">
          <div className="flex items-center gap-2"><Sparkles size={17} className="text-[#FFD166]" /><h2 className="text-sm font-black">数据使用边界</h2></div><p className="mt-2 text-xs font-bold leading-6 text-[#DDE1EA]">研究数据只用于评估笔触拆解引导对零基础绘画者开始动笔、完成练习与持续练习的帮助。学习反馈描述交互事实，不进行心理、健康、天赋或人格推断。</p>
        </section>
      </div>
    </main>
  );
}

function ToggleCard({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-[#C8CEDA] p-4"><div><p className="text-sm font-black text-[#17233F]">{title}</p><p className="mt-1 text-[11px] font-bold leading-5 text-[#65708A]">{description}</p></div><Toggle checked={checked} onChange={onChange} /></div>;
}

function ConsentCard({ icon: Icon, color, title, description, checked, onChange }: { icon: typeof Database; color: string; title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-start gap-3 rounded-2xl border-2 border-[#C8CEDA] p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#17233F]" style={{ background: color }}><Icon size={17} strokeWidth={2.7} /></span><div className="min-w-0 flex-1"><p className="text-sm font-black text-[#17233F]">{title}</p><p className="mt-1 text-[11px] font-bold leading-5 text-[#65708A]">{description}</p></div><Toggle checked={checked} onChange={onChange} /></div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={checked ? '关闭此选项' : '开启此选项'} onClick={() => onChange(!checked)} className="relative mt-0.5 h-8 w-14 shrink-0 rounded-full border-2 border-[#17233F] transition-colors" style={{ background: checked ? '#69D2C2' : '#DDE1EA' }}><span className="absolute top-[3px] h-[22px] w-[22px] rounded-full border-2 border-[#17233F] bg-white transition-all" style={{ left: checked ? 27 : 3 }} /></button>;
}
