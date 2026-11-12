'use client';
import type { MaterialInstance } from '@/lib/material-layout';
import { maskStrokePath } from '@/lib/material-editing';
/** Keep the original image mounted while brush marks update only the SVG mask. */
export default function MaterialPreview({ item }: { item: MaterialInstance }) {
  const height = 1000 / item.material.ratio, id = `object-mask-${item.id}`;
  return <svg className="material-preview-image" viewBox={`0 0 1000 ${height}`} aria-hidden="true">
    <defs><mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={1000} height={height} style={{ maskType: 'luminance' }}>
      <rect width={1000} height={height} fill="white" />
      {item.mask?.map((mark, index) => <path key={index} d={maskStrokePath(mark)} fill="none" stroke={mark.restore ? 'white' : 'black'} strokeWidth={mark.size} strokeLinecap="round" strokeLinejoin="round" />)}
    </mask></defs>
    <image href={item.src} width={1000} height={height} preserveAspectRatio="none" mask={`url(#${id})`} />
  </svg>;
}
