'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { Shapes, Flower2, Cloud, History, Search, Plus, Star, X } from 'lucide-react';
import type { Material } from '@/lib/co-create';
import { filterMaterials, readMaterialPreferences, updateMaterialPreferences, MATERIAL_PREFERENCES_EVENT, MATERIAL_PREFERENCES_KEY, type LibraryPreferences } from '@/lib/material-library';

const categories = [
  { id: 'all', title: '全部素材', icon: Shapes },
  { id: 'favorites', title: '我的收藏', icon: Star },
  { id: 'recent', title: '最近使用', icon: History },
  { id: 'plants', title: '花草', icon: Flower2 },
  { id: 'sky', title: '天空', icon: Cloud },
];

export default function MaterialLibrary({ disabled, onAdd }: { disabled: boolean; onAdd: (material: Material, variation: number) => void }) {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [preferences, setPreferences] = useState<LibraryPreferences>({ favorites: [], recent: [] });
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const refresh = () => setPreferences(readMaterialPreferences());
    const storage = (event: StorageEvent) => { if (event.key === null || event.key === MATERIAL_PREFERENCES_KEY) refresh(); };
    const frame = requestAnimationFrame(refresh);
    window.addEventListener(MATERIAL_PREFERENCES_EVENT, refresh);
    window.addEventListener('storage', storage);
    return () => { cancelAnimationFrame(frame); window.removeEventListener(MATERIAL_PREFERENCES_EVENT, refresh); window.removeEventListener('storage', storage); };
  }, []);
  const items = filterMaterials(category, query, preferences);
  return <div className="material-library">
    <nav className="material-categories" aria-label="素材分类">{categories.map(({ id, title, icon: Icon }) => <button key={id} aria-pressed={category === id} onClick={() => { setCategory(id); setNotice(''); }}><Icon size={16} /><span>{title}</span></button>)}</nav>
    <div className="material-library-body"><label className="material-search"><Search size={16} /><input aria-label="搜索素材" placeholder="搜索花朵、天空…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" aria-label="清空搜索" onClick={() => setQuery('')}><X size={15} /></button>}</label>
      <p className="creation-note">{items.length} 款 · 点选连续添加，或拖入画布</p>
      <div className="material-library-items motion-swap" key={category}>{items.map(item => <div className="material-library-entry" key={item.key}>
        <button className="material-library-add" disabled={disabled} aria-label={`添加${item.label}`} onClick={() => { onAdd(item.material, item.variation); setNotice(`已添加${item.label}，可以继续添加。`); }} draggable={!disabled} onDragStart={e => { e.dataTransfer.setData('application/x-startrace-material', item.material.id); e.dataTransfer.setData('application/x-startrace-variation', String(item.variation)); e.dataTransfer.effectAllowed = 'copy'; }}><span>{item.label}<Plus size={14} /></span><img src={item.preview} alt="" draggable={false} /></button>
        <button className="material-favorite" title={preferences.favorites.includes(item.key) ? '取消收藏' : '收藏素材'} aria-label={`${preferences.favorites.includes(item.key) ? '取消收藏' : '收藏'}${item.label}`} aria-pressed={preferences.favorites.includes(item.key)} onClick={() => { const saved = updateMaterialPreferences('favorite', item.key); setNotice(saved ? '收藏已更新' : '浏览器无法保存偏好，本次使用期间仍可收藏。'); }}><Star size={16} fill={preferences.favorites.includes(item.key) ? 'currentColor' : 'none'} /></button>
      </div>)}</div>
      {!items.length && <div className="material-empty"><p className="creation-note">{query ? '没有找到匹配的素材，试试“花”或“天空”。' : category === 'favorites' ? '点素材旁的星标，即可收藏。' : '添加过的素材会出现在这里。'}</p><button onClick={() => { setQuery(''); setCategory('all'); }}>查看全部素材</button></div>}
      <p className="creation-note" role="status">{notice}</p>
      <p className="creation-note">含三类基础图案及形态变体。收藏与最近使用保存在此浏览器。</p>
    </div>
  </div>;
}
