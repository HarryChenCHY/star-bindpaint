import { Moon, Sparkle } from 'lucide-react';

/** Attribution belongs to the interface, never to exported artwork pixels. */
export default function ArtworkCredit({ author, mode }: { author?: string; mode: 'co-create' | 'free' }) {
  return <div className="artwork-credit">
    <span><Sparkle size={15} strokeWidth={1.6} aria-hidden="true" />{author ? `${author} 创作` : '由你创作'}</span>
    {mode === 'co-create' && <span><Moon size={15} strokeWidth={1.6} aria-hidden="true" />星迹辅助绘制</span>}
  </div>;
}
