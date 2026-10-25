'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useInterfaceMotion } from './useInterfaceMotion';

gsap.registerPlugin(useGSAP);

// Fixed coordinates keep server/client rendering identical; no particle simulation.
const stars = [
  [350, 38, 4], [490, 90, 6], [635, 27, 3], [786, 74, 7],
  [940, 31, 4], [1080, 120, 5], [1290, 195, 4], [1374, 310, 6],
  [55, 440, 4], [1304, 530, 5], [1170, 710, 6], [350, 760, 5],
];
const dust = [[420, 65], [566, 40], [710, 98], [864, 47], [1010, 88], [1180, 55], [1320, 90], [1200, 250], [1400, 480], [1270, 640], [1040, 780], [250, 680], [100, 610], [60, 230]];

export default function StarField({ quiet = false }: { quiet?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useInterfaceMotion();
  useGSAP(() => {
    if (reduced || quiet || !root.current) return;
    const targets = root.current.querySelectorAll('[data-star-pulse]');
    const sequence = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 2, delay: 2 });
    targets.forEach((star, index) => {
      const start = index * .65;
      sequence.to(star, { opacity: .68, scale: 1.12, duration: 2.6, ease: 'sine.inOut', transformOrigin: '50% 50%' }, start)
        .to(star, { opacity: .24, scale: 1, duration: 3.4, ease: 'sine.inOut' }, start + 2.6);
    });
    let onScreen = false;
    const sync = () => { sequence.paused(!onScreen || document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); });
    observer.observe(root.current);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, { scope: root, dependencies: [reduced, quiet], revertOnUpdate: true });

  return <div ref={root} className="star-field" data-quiet={quiet} aria-hidden="true">
    <svg viewBox="0 0 1440 840" preserveAspectRatio="xMidYMin slice" focusable="false">
      <g className="star-orbits" fill="none" stroke="currentColor" strokeWidth=".8">
        <path d="M320 10 C510 180 830 -60 1110 132 S1340 220 1450 190" />
        <path d="M1050 835 C1290 740 1190 570 1450 485" strokeDasharray="2 12" />
        <path d="M490 90 L635 27 L786 74 L940 31" strokeDasharray="2 7" />
      </g>
      <g fill="currentColor" className="star-dust">{dust.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />)}</g>
      {stars.map(([x, y, size], index) => <g key={x} transform={`translate(${x} ${y})`} className={index % 3 === 0 ? 'star-violet' : 'star-white'}>
        <g data-star-pulse={index < 8 ? '' : undefined} className="star-glyph">
          <path d={`M0 ${-size} Q${size * .17} ${-size * .17} ${size} 0 Q${size * .17} ${size * .17} 0 ${size} Q${-size * .17} ${size * .17} ${-size} 0 Q${-size * .17} ${-size * .17} 0 ${-size}Z`} fill="currentColor" />
        </g>
      </g>)}
    </svg>
  </div>;
}
