'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState<{
    masterwork?: { title: string; artist: string } | null;
    mood?: string;
    completedStrokes?: number;
    totalStrokes?: number;
    finalImageBase64?: string;
  } | null>(null);

  useEffect(() => {
    const prompt = sessionStorage.getItem('star-bindpaint-prompt');
    const sessionStr = sessionStorage.getItem('star-bindpaint-session');

    if (!prompt || !sessionStr) {
      setError('没有找到绘画数据，请先完成一幅画作');
      setLoading(false);
      return;
    }

    const session = JSON.parse(sessionStr);
    setSessionData(session);

    // 调用分析 API
    fetchReport(prompt, session.finalImageBase64);
  }, []);

  async function fetchReport(prompt: string, imageBase64: string) {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageBase64 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || '请求失败');
      }

      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      setError(`分析失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-12 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8">
        <button
          onClick={() => router.push('/gallery')}
          className="text-sm font-medium"
          style={{ color: '#666' }}
        >
          ← 返回画廊
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
          绘画观察报告
        </h1>
        <div className="w-16" />
      </div>

      {/* 画作预览 */}
      {sessionData?.finalImageBase64 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-8"
        >
          <img
            src={sessionData.finalImageBase64}
            alt="画作"
            className="w-full max-w-sm mx-auto rounded-2xl shadow-lg"
            style={{ border: '2px solid #E5E5E5' }}
          />
          <div className="text-center mt-3 text-sm" style={{ color: '#888' }}>
            {sessionData.masterwork
              ? `临摹 ${sessionData.masterwork.artist}《${sessionData.masterwork.title}》`
              : '自由创作'}
            {sessionData.mood && ` · ${sessionData.mood}色调`}
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full"
            style={{ border: '3px solid #E5E5E5', borderTopColor: '#7A51EC' }}
          />
          <p style={{ color: '#888', fontSize: '0.9rem' }}>
            Starry 正在观察你的画作...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="w-full p-4 rounded-xl text-center" style={{ background: '#FEF2F2', color: '#DC2626' }}>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => router.push('/create')}
            className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ background: '#7A51EC', color: 'white' }}
          >
            去创作
          </button>
        </div>
      )}

      {/* Report */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          {/* 观察卡片 */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ background: '#F8F7FF', border: '1px solid #E8E5F5' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">⭐</span>
              <h2 className="font-bold" style={{ color: '#1A1A1A' }}>
                Starry 的观察
              </h2>
            </div>
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: '#444' }}
            >
              {report}
            </div>
          </div>

          {/* 数据摘要 */}
          {sessionData && (
            <div className="grid grid-cols-3 gap-3">
              <DataCard
                label="完成度"
                value={`${Math.round(((sessionData.completedStrokes || 0) / (sessionData.totalStrokes || 1)) * 100)}%`}
              />
              <DataCard
                label="手绘笔触"
                value={`${sessionData.completedStrokes || 0} 笔`}
              />
              <DataCard
                label="总笔触"
                value={`${sessionData.totalStrokes || 0} 笔`}
              />
            </div>
          )}

          {/* 免责声明 */}
          <p className="text-center mt-8 text-xs" style={{ color: '#BBB' }}>
            本报告由 AI 生成，仅作为观察辅助记录，不构成任何医学或心理学建议。
          </p>
        </motion.div>
      )}
    </div>
  );
}

function DataCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: '#F5F5F5' }}>
      <div className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: '#888' }}>{label}</div>
    </div>
  );
}
