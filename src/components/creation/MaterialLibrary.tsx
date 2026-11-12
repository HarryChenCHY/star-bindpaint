'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Shapes, Flower2, Cloud, Users, Heart, Cat, Armchair, Coffee, MapPin, History, Search, Plus, Star, X, Camera, ImagePlus, LoaderCircle } from 'lucide-react';
import { MATERIAL_CATEGORIES } from '@/lib/material-categories';
import type { Material } from '@/lib/co-create';
import { filterMaterials, readMaterialPreferences, updateMaterialPreferences, MATERIAL_PREFERENCES_EVENT, MATERIAL_PREFERENCES_KEY, type LibraryPreferences } from '@/lib/material-library';
import { MATERIAL_IMAGE_ACCEPT, MAX_UPLOADED_MATERIALS, readUploadedMaterial } from '@/lib/uploaded-material';
import { useStudioPanel } from './StudioWorkspace';

const themeIcons = [Users, Heart, Cat, Flower2, Cloud, Armchair, Coffee, MapPin];
const categories = [{ id: 'all', title: '全部素材', icon: Shapes }, ...MATERIAL_CATEGORIES.map((category, i) => ({ ...category, icon: themeIcons[i] }))];
const quickViews = [{ id: 'favorites', title: '收藏', icon: Star }, { id: 'recent', title: '最近', icon: History }, { id: 'uploaded', title: '本次上传', icon: ImagePlus }];

export default function MaterialLibrary({ disabled, onAdd, uploads = [], onUpload, pendingCount = 0, controls }: { controls?: ReactNode; pendingCount?: number; disabled: boolean; onAdd: (material: Material, variation: number) => void; uploads?: Material[]; onUpload?: (material: Material) => void }) {
  const { closeForTouch, close } = useStudioPanel();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [preferences, setPreferences] = useState<LibraryPreferences>({ favorites: [], recent: [] });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setCameraAvailable(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)));
    return () => { cancelAnimationFrame(frame); controller.current?.abort(); };
  }, []);
  useEffect(() => {
    const refresh = () => setPreferences(readMaterialPreferences());
    const storage = (event: StorageEvent) => { if (event.key === null || event.key === MATERIAL_PREFERENCES_KEY) refresh(); };
    const frame = requestAnimationFrame(refresh);
    window.addEventListener(MATERIAL_PREFERENCES_EVENT, refresh);
    window.addEventListener('storage', storage);
    return () => { cancelAnimationFrame(frame); window.removeEventListener(MATERIAL_PREFERENCES_EVENT, refresh); window.removeEventListener('storage', storage); };
  }, []);
  const items = filterMaterials(category, query, preferences, uploads);
  async function importFile(file?: File) {
    if (!onUpload || !file || disabled || controller.current) return;
    if (uploads.length >= MAX_UPLOADED_MATERIALS) { setError('本次创作最多上传20张素材。'); return; }
    const task = new AbortController(); controller.current = task;
    setUploading(true); setError(''); setNotice('正在本地处理素材…');
    try {
      const material = await readUploadedMaterial(file, task.signal);
      if (task.signal.aborted) return;
      onUpload(material); setCategory('uploaded'); setQuery('');
      setNotice(`已添加${material.label}，可以在画布上调整。`); closeForTouch();
    } catch (failure) {
      if (!task.signal.aborted) { setNotice(''); setError(failure instanceof Error ? failure.message : '素材导入失败，请重试。'); }
    } finally {
      controller.current = null;
      if (!task.signal.aborted) setUploading(false);
    }
  }
  return <div className="material-library">
    <nav className="material-categories" aria-label="素材分类">{categories.map(({ id, title, icon: Icon }) => <button key={id} title={title} aria-label={title} aria-pressed={category === id} onClick={() => { setCategory(id); setNotice(''); }}><Icon size={16} /><span className="material-category-label"><span>{title.slice(0, 2)}</span><span>{title.slice(2)}</span></span></button>)}</nav>
    <div className="material-library-body">
      <div className="material-quick-views" aria-label="素材快捷入口">{quickViews.filter(view => onUpload || view.id !== 'uploaded').map(({ id, title, icon: Icon }) => <button key={id} aria-pressed={category === id} onClick={() => { setCategory(id); setNotice(''); }}><Icon size={14} />{title}</button>)}</div>
      {onUpload && <div className="material-import-actions">
        <input ref={fileInput} type="file" accept={MATERIAL_IMAGE_ACCEPT} hidden aria-label="上传本地素材图片" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
        <button type="button" disabled={disabled || uploading || uploads.length >= MAX_UPLOADED_MATERIALS} onClick={() => fileInput.current?.click()}>{uploading ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />}上传图片</button>
        {cameraAvailable && <><input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden aria-label="拍照添加素材" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }} /><button type="button" disabled={disabled || uploading || uploads.length >= MAX_UPLOADED_MATERIALS} onClick={() => cameraInput.current?.click()}><Camera size={16} />拍照</button></>}
      </div>}
      <label className="material-search"><Search size={16} /><input aria-label="搜索素材" placeholder="搜索" value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" aria-label="清空搜索" onClick={() => setQuery('')}><X size={15} /></button>}</label>
      <p className="creation-note">{items.length} 款 · 点选连续添加，或拖入画布</p>
      {controls && <details className="material-options"><summary>素材选项</summary><div className="creation-card">{controls}</div></details>}
      <div className="material-library-items motion-swap" key={category}>{items.map(item => <div className="material-library-entry" key={item.key}>
        <button className="material-library-add" disabled={disabled || uploading} title={item.label} aria-label={`添加${item.label}`} onClick={() => { onAdd(item.material, item.variation); setNotice(`已添加${item.label}，可以继续添加。`); closeForTouch(); }} draggable={!disabled && !uploading} onDragStart={e => { e.dataTransfer.setData('application/x-startrace-material', item.material.id); e.dataTransfer.setData('application/x-startrace-variation', String(item.variation)); e.dataTransfer.effectAllowed = 'copy'; }}><span><span className="material-item-name">{item.label}</span><Plus size={14} /></span><img src={item.preview} alt="" draggable={false} loading="lazy" decoding="async" /></button>
        <button className="material-favorite" title={preferences.favorites.includes(item.key) ? '取消收藏' : '收藏素材'} aria-label={`${preferences.favorites.includes(item.key) ? '取消收藏' : '收藏'}${item.label}`} aria-pressed={preferences.favorites.includes(item.key)} onClick={() => { const saved = updateMaterialPreferences('favorite', item.key); setNotice(saved ? '收藏已更新' : '浏览器无法保存偏好，本次使用期间仍可收藏。'); }}><Star size={16} fill={preferences.favorites.includes(item.key) ? 'currentColor' : 'none'} /></button>
      </div>)}</div>
      {!items.length && <div className="material-empty"><p className="creation-note">{query ? '没有找到匹配的素材，试试其他关键词。' : category === 'favorites' ? '点素材旁的星标，即可收藏。' : category === 'uploaded' ? '上传图片或拍照，制作你自己的素材。' : '添加过的素材会出现在这里。'}</p><button onClick={() => { setQuery(''); setCategory('all'); }}>查看全部素材</button></div>}
      {error && <p className="creation-error" role="alert">{error}</p>}
      <p className="creation-note" role="status">{notice}</p>
      <details className="material-license"><summary>来源与许可</summary><p>精选自 Twemoji v14.0.2，© Twitter, Inc. 及其他贡献者，许可为 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>。中文分类与检索词由星迹智绘整理。编排、擦除、配色与笔触绘制会产生改编效果。</p><p><a href="/materials/twemoji/ATTRIBUTION.md" target="_blank" rel="noreferrer">来源、署名与学术引用</a> · <a href="/materials/default-materials-manifest.json" target="_blank" rel="noreferrer">逐项来源清单</a></p></details>
      {onUpload && <p className="creation-note">上传素材仅在本次创作中使用，不会发送到服务器。支持透明PNG，每张小于20MB，最多20张。</p>}
    </div>
    <div className="material-library-footer"><span>待编排 {pendingCount} 个</span><button type="button" onClick={close}>去编排</button></div>
  </div>;
}
