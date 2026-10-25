'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { ArrowDownWideNarrow, Brush, Clock3, Download, FlaskConical, Grid2X2, HelpCircle, Plus, Search, Settings2, Sparkles, Trash2, X } from 'lucide-react';
import { deleteFromGallery, clearGallery, loadGallery, type GalleryItem } from '@/lib/gallery-store';
import styles from '@/app/workspace.module.css';
import { useSceneTransition } from './motion/SceneTransition';
import ArtworkCredit from './creation/ArtworkCredit';

const categories = [
  { id: 'recent', label: '最近作品', icon: Clock3 },
  { id: 'all', label: '全部作品', icon: Grid2X2 },
  { id: 'co-create', label: 'AI 共创', icon: Sparkles },
  { id: 'free', label: '自由绘画', icon: Brush },
] as const;
type Category = typeof categories[number]['id'];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '已保存' : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export default function ArtworkWorkspace({ gallery = false }: { gallery?: boolean }) {
  const { begin } = useSceneTransition();
  function openCreation(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    begin('create');
  }
  const [works, setWorks] = useState<GalleryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState<Category>(gallery ? 'all' : 'recent');
  const [query, setQuery] = useState('');
  const [oldestFirst, setOldestFirst] = useState(false);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const refresh = () => { setWorks(loadGallery()); setReady(true); };
    const frame = requestAnimationFrame(refresh);
    window.addEventListener('startrace-gallery-updated', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('startrace-gallery-updated', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);

  useEffect(() => {
    if (previewOpen && selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected, previewOpen]);

  const visibleWorks = works
    .filter(work => (category === 'all' || category === 'recent' || work.mode === category)
      && work.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => {
      const timeA = Date.parse(a.date) || 0;
      const timeB = Date.parse(b.date) || 0;
      return oldestFirst ? timeA - timeB : timeB - timeA;
    });
  const title = categories.find(item => item.id === category)!.label;

  function removeWork() {
    if (!selected || !confirm('确定删除这幅作品？此操作无法撤销。')) return;
    try { deleteFromGallery(selected.id); dialog.current?.close(); }
    catch { setError('删除失败，请检查浏览器存储权限后重试。'); }
  }

  function removeAll() {
    if (!confirm('确定清空当前浏览器中的所有作品？此操作无法撤销。')) return;
    try { clearGallery(); setError(''); }
    catch { setError('清空失败，请检查浏览器存储权限后重试。'); }
  }

  return <div className={`${styles.workspace} star-workspace`}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="星迹智绘首页"><Sparkles size={25} strokeWidth={1.6} /><span>星迹智绘<small>StarTrace</small></span></Link>
      <nav className={styles.actions} aria-label="主要功能">
        <Link href="/create" onClick={openCreation} className={styles.newButton}><Plus size={18} /><span>新建作品</span></Link>
        <span className={styles.divider} aria-hidden="true" />
        <Link href="/intro" className={styles.iconLink} title="产品介绍" aria-label="产品介绍"><HelpCircle size={19} /><span>介绍</span></Link>
        <Link href="/study" className={styles.iconLink} title="用户测试" aria-label="用户测试"><FlaskConical size={19} /><span>测试</span></Link>
        <Link href="/settings" className={styles.iconLink} title="设置" aria-label="设置"><Settings2 size={19} /></Link>
      </nav>
    </header>

    <aside className={styles.sidebar} aria-label="作品分类">
      <nav>{categories.map(({ id, label, icon: Icon }) => <button key={id} type="button"
        className={category === id ? styles.activeCategory : ''} aria-pressed={category === id}
        onClick={() => { setCategory(id); if (id === 'recent') setOldestFirst(false); }}>
        <Icon size={18} strokeWidth={1.7} /><span>{label}</span>
      </button>)}</nav>
      <p className={styles.localNote}>你的作品，留在这里。<br /><span>作品保存在当前浏览器</span></p>
    </aside>

    <main className={styles.main}>
      <div className={styles.libraryHeader}>
        <div className={styles.heading}><h1>{gallery && category === 'all' ? '我的星图' : title}</h1><span aria-live="polite">{ready ? `${visibleWorks.length} 幅` : '读取中'}</span></div>
        <div className={styles.libraryTools}>
          <label className={styles.search}><Search size={16} /><input aria-label="搜索作品" placeholder="搜索作品" value={query} onChange={event => setQuery(event.target.value)} />
            {query && <button type="button" aria-label="清空搜索" onClick={() => setQuery('')}><X size={15} /></button>}
          </label>
          <button type="button" className={styles.sort} title={oldestFirst ? '最早保存优先，点击切换' : '最近保存优先，点击切换'} aria-label={oldestFirst ? '最早保存优先，切换为最近保存优先' : '最近保存优先，切换为最早保存优先'} onClick={() => setOldestFirst(value => !value)}>
            <ArrowDownWideNarrow size={18} style={{ transform: oldestFirst ? 'scaleY(-1)' : undefined }} /><span>{oldestFirst ? '最早保存' : '最近保存'}</span>
          </button>
        </div>
      </div>

      {gallery && works.length > 0 && <button type="button" className={styles.clearButton} onClick={removeAll}><Trash2 size={16} />清空作品</button>}
      {error && !previewOpen && <p className="night-alert" role="alert">{error}</p>}
      {!ready ? <div className={styles.empty} role="status"><p>正在读取你的作品…</p></div>
        : visibleWorks.length > 0 ? <div className={`${styles.grid} motion-swap`} key={`${category}-${oldestFirst}`}>
          {visibleWorks.map(work => <button type="button" className={styles.card} key={work.id} onClick={() => { setError(''); setSelected(work); setPreviewOpen(true); }} aria-label={`查看作品：${work.title || '未命名'}`}>
            <div className={styles.thumbnail}>
              {/* 本地作品为动态 data URL，保留原始图像比例。 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={work.imageDataUrl} alt={work.title || '未命名作品'} loading="lazy" decoding="async" />
            </div>
            <div className={styles.caption}><h2>{work.title || '未命名'}</h2><time dateTime={work.date}>{formatDate(work.date)}</time></div>
          </button>)}
        </div> : <div className={styles.empty}>
          <div className={styles.emptyArt} aria-hidden="true"><Brush size={35} strokeWidth={1.2} /></div>
          <h2>{query ? '没有找到这幅作品' : works.length ? '这里还没有作品' : '从一幅新作品开始'}</h2>
          <p>{query ? '试试其他名字，或清空搜索。' : '用一张照片开始共创，或打开自由画布。'}</p>
          {query ? <button type="button" className={styles.emptyButton} onClick={() => setQuery('')}>清空搜索</button>
            : <Link href="/create" onClick={openCreation} className={styles.emptyButton}><Plus size={17} />新建作品</Link>}
        </div>}
    </main>

    <dialog ref={dialog} className={`${styles.preview} motion-dialog`} aria-labelledby="preview-title" onClose={() => setPreviewOpen(false)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {selected && <div className={styles.previewContent}>
        <header><div><h2 id="preview-title">{selected.title || '未命名'}</h2><p>{formatDate(selected.date)}</p></div><button type="button" aria-label="关闭作品预览" onClick={() => dialog.current?.close()} autoFocus><X size={21} /></button></header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selected.imageDataUrl} alt={selected.title || '未命名作品'} />
        {(selected.mode === 'co-create' || selected.mode === 'free') && <ArtworkCredit author={selected.author} mode={selected.mode} />}
        <footer><button type="button" className={styles.deleteButton} onClick={removeWork}><Trash2 size={17} />删除</button><a href={selected.imageDataUrl} download={`${selected.title || '星迹作品'}.png`}><Download size={17} />下载作品</a></footer>
        {error && <p className="night-alert" role="alert">{error}</p>}
      </div>}
    </dialog>
  </div>;
}
