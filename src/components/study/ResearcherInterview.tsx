'use client';
import { useState } from 'react';
import { api } from '@/lib/study/client';
import { INTERVIEW } from '@/lib/study/protocol';

export function ResearcherInterview({ pairId, code, answers: saved, token, available, onSaved }: {
  pairId: string; code: string; answers: string[] | null; token: string; available: boolean; onSaved: () => Promise<void>;
}) {
  const [answers, setAnswers] = useState(
    INTERVIEW.map((_, index) => saved?.[index] ?? ''),
  );
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  return <section className="study-card" aria-label="研究者访谈记录">
    <h2>口头访谈记录 · {code}</h2>
    <p className="study-muted">参与者不在页面填写长文本。请在两轮量表完成后进行约 10 分钟半结构化访谈，保持措辞中性、按原意记录；未回答留空。保存会标记为研究者录入，并保留操作审计。</p>
    {!available ? <p>两轮及后测完成后可记录；已撤回的测试不可修改。</p> : <>
      {INTERVIEW.map((question, index) => <label key={question} className="my-3 flex-col !items-start">{question}<textarea maxLength={2000} value={answers[index]} onChange={e => setAnswers(v => v.map((a, i) => i === index ? e.target.value : a))} /></label>)}
      {saved && <label className="my-3 flex-col !items-start">修改原因<input value={reason} maxLength={500} onChange={e => setReason(e.target.value)} /></label>}
      <button className="primary" disabled={busy || (!!saved && !reason.trim())} onClick={async () => {
        setBusy(true); setMessage('');
        try {
          await api({ action: 'recordInterview', pairId, answers, reason }, token);
          setMessage('访谈已保存'); await onSaved();
        } catch (e) { setMessage(e instanceof Error ? e.message : '保存失败，请重试'); }
        finally { setBusy(false); }
      }}>{busy ? '正在保存…' : '保存口头访谈'}</button>
      {saved && <p className="study-muted">已有访谈记录；如需修改，请填写原因。</p>}
      {message && <p role="status">{message}</p>}
    </>}
  </section>;
}
