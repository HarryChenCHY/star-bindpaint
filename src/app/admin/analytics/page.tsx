'use client';

import { useState, useEffect } from 'react';

interface StatsData {
  date: string;
  total: number;
  sessions: Record<string, unknown>[];
  summary: {
    totalSessions: number;
    avgDurationSec: number;
    maxDurationSec: number;
    minDurationSec: number;
    byMode: Record<string, number>;
    byDifficulty: Record<string, number>;
    byEmotionBefore: Record<string, number>;
    byEmotionAfter: Record<string, number>;
    avgStrokes: number;
    avgCalmTriggered: number;
  } | null;
}

export default function AnalyticsDashboard() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/stats?date=${d}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(date); }, [date]);

  const s = data?.summary;

  return (
    <div className="min-h-screen bg-white px-4 py-8" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="mx-auto max-w-4xl">
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em' }}>
          📊 星绘智愈 · 数据面板
        </h1>

        <div className="mt-6 flex items-center gap-3">
          <span style={{ fontWeight: 800, color: '#888', fontSize: '0.9rem' }}>日期:</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-xl px-4 py-2"
            style={{ border: '2px solid #1A1A1A', fontWeight: 700, fontSize: '0.95rem' }}
          />
          <button
            onClick={() => fetchData(date)}
            className="rounded-full px-5 py-2"
            style={{ background: '#1A1A1A', color: '#FFF', border: '2px solid #1A1A1A', fontWeight: 800, fontSize: '0.85rem' }}
          >
            {loading ? '查询中...' : '刷新'}
          </button>
        </div>

        {!data && !loading && (
          <p className="mt-8" style={{ color: '#999', fontWeight: 700 }}>选择日期后点击查询</p>
        )}
        {loading && (
          <p className="mt-8" style={{ color: '#999', fontWeight: 700 }}>加载中...</p>
        )}

        {s && (
          <div className="mt-6 space-y-4">
            {/* 概览卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '总绘画次数', value: s.totalSessions, unit: '次' },
                { label: '平均时长', value: s.avgDurationSec, unit: '秒' },
                { label: '平均笔画数', value: s.avgStrokes, unit: '笔' },
                { label: '触发平静呼吸', value: s.avgCalmTriggered, unit: '次/人' },
              ].map(c => (
                <div key={c.label} className="rounded-2xl p-4 bg-white" style={{ border: '2px solid #1A1A1A', boxShadow: '3px 3px 0 #1A1A1A' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888' }}>{c.label}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1A1A1A', marginTop: 4 }}>
                    {c.value}<span style={{ fontSize: '0.8rem', color: '#999', marginLeft: 2 }}>{c.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 分布 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: '模式分布', data: s.byMode, colors: { follow: '#F9B801', auto: '#F302C9', free: '#7DC353' } as Record<string,string> },
                { title: '难度分布', data: s.byDifficulty, colors: { sticker: '#7DC353', tracing: '#F9B801', free: '#7A51EC' } },
                { title: '画前情绪', data: s.byEmotionBefore, colors: { happy: '#F9B801', calm: '#7BA7CC', anxious: '#F302C9', sad: '#7A51EC' } },
                { title: '画后情绪', data: s.byEmotionAfter, colors: { happy: '#F9B801', calm: '#7BA7CC', anxious: '#F302C9', sad: '#7A51EC' } },
              ].map(chart => (
                <div key={chart.title} className="rounded-2xl p-5 bg-white" style={{ border: '2px solid #1A1A1A', boxShadow: '3px 3px 0 #1A1A1A' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1A1A1A', marginBottom: 12 }}>{chart.title}</h3>
                  {Object.entries(chart.data).map(([key, count]) => (
                    <div key={key} className="flex items-center gap-2 mb-2">
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', minWidth: 60 }}>{key}</span>
                      <div className="flex-1 h-5 rounded-full overflow-hidden bg-white" style={{ border: '1.5px solid #E5E5E5' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.totalSessions > 0 ? (count / s.totalSessions * 100) : 0}%`,
                            background: chart.colors[key] || '#1A1A1A',
                            minWidth: count > 0 ? 12 : 0,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1A1A1A', minWidth: 28, textAlign: 'right' }}>{count}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 时长 */}
            <div className="rounded-2xl p-5 bg-white" style={{ border: '2px solid #1A1A1A', boxShadow: '3px 3px 0 #1A1A1A' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1A1A1A', marginBottom: 12 }}>使用时长范围</h3>
              <div className="flex gap-6 text-center">
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#888' }}>最短</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#7DC353' }}>{s.minDurationSec}秒</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#888' }}>平均</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1A1A1A' }}>{s.avgDurationSec}秒</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#888' }}>最长</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#F302C9' }}>{s.maxDurationSec}秒</div>
                </div>
              </div>
            </div>

            {/* 原始数据表格 */}
            <details className="mt-4">
              <summary style={{ fontWeight: 800, color: '#888', cursor: 'pointer', fontSize: '0.85rem' }}>
                查看原始数据 ({data.sessions.length} 条)
              </summary>
              <div className="mt-3 overflow-auto" style={{ maxHeight: 400 }}>
                <table className="w-full text-left" style={{ fontSize: '0.72rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #1A1A1A' }}>
                      <th className="p-2" style={{ fontWeight: 800 }}>ID</th>
                      <th className="p-2" style={{ fontWeight: 800 }}>时长</th>
                      <th className="p-2" style={{ fontWeight: 800 }}>模式</th>
                      <th className="p-2" style={{ fontWeight: 800 }}>难度</th>
                      <th className="p-2" style={{ fontWeight: 800 }}>情绪前</th>
                      <th className="p-2" style={{ fontWeight: 800 }}>情绪后</th>
                      <th className="p-2" style={{ fontWeight: 800 }}>完成率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.sessions as Record<string, unknown>[]).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #E5E5E5' }}>
                        <td className="p-2" style={{ color: '#999' }}>{(row.id as string)?.slice(0, 12)}</td>
                        <td className="p-2" style={{ fontWeight: 700 }}>{row.durationSec as number}秒</td>
                        <td className="p-2">{row.mode as string}</td>
                        <td className="p-2">{row.difficulty as string}</td>
                        <td className="p-2">{row.emotionBefore as string}</td>
                        <td className="p-2">{row.emotionAfter as string}</td>
                        <td className="p-2" style={{ fontWeight: 700 }}>{row.completionRate as number}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
