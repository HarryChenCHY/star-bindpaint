'use client';

import { useEffect, useState } from 'react';

interface TracingSceneLayerProps {
  src: string;
  visible?: boolean;
}

/** 内联渲染 SVG 场景图，避免 img 加载 SVG 失败 */
export default function TracingSceneLayer({ src, visible = true }: TracingSceneLayerProps) {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvgMarkup(null);

    fetch(src)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(text => {
        if (!cancelled) setSvgMarkup(text);
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup(null);
      });

    return () => { cancelled = true; };
  }, [src]);

  if (!visible || !svgMarkup) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1, opacity: 0.42, padding: '3%' }}
      aria-hidden
    >
      <div
        className="w-full h-full pointer-events-none [&>svg]:block [&>svg]:w-full [&>svg]:h-full [&>svg]:pointer-events-none"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  );
}
