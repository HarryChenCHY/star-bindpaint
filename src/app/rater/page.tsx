'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/study/client';
import { Artwork } from '@/components/study/StudyReport';
import type { Rating } from '@/lib/study/types';
import '../study/study.css';
type RaterView = {
  rater: string;
  rubric: string[];
  artworks: { id: string; label: string; rating: Rating | null }[];
};
export default function RaterPage() {
  const [token, setToken] = useState(''),
    [studyId, setStudyId] = useState('novice-pilot-v1'),
    [data, setData] = useState<RaterView | null>(null);
  const [index, setIndex] = useState(0),
    [scores, setScores] = useState<number[]>(Array(10).fill(-1)),
    [reason, setReason] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    const result = await api<RaterView>(
      undefined,
      token,
      `?action=ratings&studyId=${studyId}`,
    );
    setData(result);
    const i = Math.max(
      0,
      result.artworks.findIndex((a) => !a.rating),
    );
    setIndex(i);
    setScores(result.artworks[i]?.rating?.scores || Array(10).fill(-1));
  }
  const item = data?.artworks[index];
  return (
    <div className="study-shell">
      <div className="study-wrap">
        <Link href="/study">← 星迹智绘研究</Link>
        <h1 className="mt-5">匿名作品评分</h1>
        <p>
          按共同清单独立评分：0 缺失，1 部分呈现，2
          清楚呈现。此处不显示绘画条件、顺序或用时。
        </p>
        <section className="study-card study-row">
          <label>
            评分者口令{' '}
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>
          <select
            value={studyId}
            onChange={(e) => {
              setStudyId(e.target.value);
              setData(null);
            }}
          >
            <option value="novice-pilot-v1">预试</option>
            <option value="novice-formal-v1">正式</option>
          </select>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await load();
                setError('');
              } catch (e) {
                setError(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            读取分配作品
          </button>
        </section>
        {error && (
          <p className="study-error" role="alert">
            {error}
          </p>
        )}
        {data && !item && <p>暂无可评分作品。</p>}
        {item && data && (
          <section className="study-card">
            <div className="study-row">
              <h2>{item.label}</h2>
              <select
                aria-label="选择匿名作品"
                value={index}
                onChange={(e) => {
                  const i = +e.target.value;
                  setIndex(i);
                  setScores(
                    data.artworks[i].rating?.scores || Array(10).fill(-1),
                  );
                  setReason('');
                }}
              >
                {data.artworks.map((a, i) => (
                  <option key={a.id} value={i}>
                    {a.label}
                    {a.rating ? ' · 已评分' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="study-grid my-4">
              <Artwork id={item.id} token={token} />
              <div>
                {data.rubric.map((r, i) => (
                  <fieldset key={i} className="mb-3">
                    <legend>
                      {i + 1}. {r}
                    </legend>
                    <div className="study-row">
                      {[0, 1, 2].map((v) => (
                        <label key={v}>
                          <input
                            type="radio"
                            name={`score-${i}`}
                            checked={scores[i] === v}
                            onChange={() =>
                              setScores((old) =>
                                old.map((s, j) => (i === j ? v : s)),
                              )
                            }
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>
            {item.rating && (
              <label className="mb-4">
                修订原因
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
            <button
              className="primary"
              disabled={
                busy || scores.includes(-1) || (!!item.rating && !reason.trim())
              }
              onClick={async () => {
                setBusy(true);
                try {
                  await api(
                    { action: 'rate', sessionId: item.id, scores, reason },
                    token,
                  );
                  await load();
                  setReason('');
                  setError('');
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              独立提交评分
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
