'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { EXPRESSION_API, expressionRequest } from '@/lib/study/expression-client';
import { RUBRIC } from '@/lib/study/expression';
import '../study/study.css';
import '../study/expression.css';

type Rating = { scores:number[];note:string };
type Work = { id:string;photo:string;intent?:string;rating?:Rating };
export default function Rater() {
  const [token,setToken]=useState('');
  const [works,setWorks]=useState<Work[]>([]);
  const [index,setIndex]=useState(0);
  const [image,setImage]=useState<{id:string;url:string}|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const work=works[index];

  useEffect(() => {
    if (!token || !work?.id) return;
    const controller=new AbortController();
    let url='';
    const [id, file] = [work.id.slice(0,-7),work.id.slice(-6)];
    fetch(`${EXPRESSION_API}?action=rater-art&id=${id}&file=${file}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal})
      .then(response => { if (!response.ok) throw new Error('作品暂时无法打开。'); return response.blob(); })
      .then(blob=>{if (!controller.signal.aborted) {url=URL.createObjectURL(blob);setImage({id:work.id,url});}})
      .catch(failure=>{if (!controller.signal.aborted) setError(failure.message);});
    return ()=>{controller.abort(); if (url) URL.revokeObjectURL(url);};
  },[token,work?.id]);

  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const value=String(new FormData(event.currentTarget).get('token') || '');
    try {
      const result=await expressionRequest<{items:Work[]}>('?action=rater-list',undefined,value);
      setWorks(result.items); setToken(value); setIndex(0);
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!work) return;
    setBusy(true);setError('');setNotice('');
    const data=new FormData(event.currentTarget);
    try {
      const result=await expressionRequest<{rating:Rating}>('',{action:'rate',id:work.id,scores:RUBRIC.map(r=>Number(data.get(r.id))),note:String(data.get('note') || '')},token);
      setWorks(current=>current.map(row=>row.id===work.id ? {...row,rating:result.rating} : row)); setNotice('本件评分已保存。');
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  return <main className="study-shell expression-study"><div className="study-wrap">
    <header className="expression-header"><h1>历史作品评分</h1><Link className="study-link" href="/">返回首页</Link></header>
    {error && <p role="alert" className="study-error">{error}</p>}
    {!token ? <section className="study-card"><h2>评分者登录</h2><form className="expression-fields" onSubmit={login}><label>评分口令<input name="token" type="password" required maxLength={256}/></label><div><button className="primary" disabled={busy}>登录</button></div></form></section> : <>
      <p>{works.filter(row=>row.rating).length} / {works.length} 件已评分</p>
      {!work ? <p>当前没有可评分的历史作品。</p> : <section className="study-card">
        <div className="expression-header"><h2>作品 {index+1} / {works.length}</h2><div className="study-tools">
          <button type="button" disabled={busy || index===0} onClick={()=>{setIndex(i=>i-1);setNotice('');setError('');}}>上一件</button>
          <button type="button" disabled={busy || index>=works.length-1} onClick={()=>{setIndex(i=>i+1);setNotice('');setError('');}}>下一件</button>
        </div></div>
        <p>初始表达意图：{work.intent || '没有可用的意图记录'}</p>
        <p className="study-muted">按意图落实情况评分。不要根据照片相似度、笔法熟练程度或推测的制作方式直接给分。2、4 分为相邻锚点之间的表现。</p>
        <div className="expression-artworks">
          <figure><img src={work.photo} alt="参考照片"/><figcaption>参考照片</figcaption></figure>
          <figure>{image?.id===work.id && <img src={image.url} alt="匿名作品"/>}<figcaption>匿名作品</figcaption></figure>
        </div>
        <form className="expression-fields" key={work.id} onSubmit={submit}>
          {RUBRIC.map((item,i)=><div key={item.id}><label>{item.title}<select name={item.id} required defaultValue={work.rating?.scores[i] ?? ''}><option value="" disabled>请选择</option>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label><p className="study-muted">{item.anchors}</p></div>)}
          <label>备注（选填）<textarea name="note" maxLength={1600} defaultValue={work.rating?.note ?? ''}/></label>
          <div><button className="primary" disabled={busy || image?.id!==work.id}>保存评分</button></div>
          {notice && <p role="status">{notice}</p>}
        </form>
      </section>}
      <button type="button" onClick={()=>{setToken('');setWorks([]);setNotice('');}}>退出评分</button>
    </>}
  </div></main>;
}
