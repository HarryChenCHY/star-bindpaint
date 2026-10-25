'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, Images, Shapes, Move, Timer, RotateCcw, Palette, Image, Save } from 'lucide-react';
import { createSceneExitGate } from '@/lib/scene-exit-gate';
import type { SceneKind } from './SceneTransition';

gsap.registerPlugin(useGSAP);
const moon = 'M18 -64 C-60 -78 -92 18 -38 58 C6 92 72 62 72 14 C18 44 -26 6 -5 -38 C0 -50 7 -58 18 -64 Z';
// Same cubic topology allows a smooth local SVG morph without a remote asset.
const brush = 'M20 -80 C30 -85 40 -75 34 -64 C25 -35 12 -7 -7 25 C-15 55 -31 62 -46 58 C-36 45 -42 28 -26 16 Z';
const star = 'M0 -9 Q2 -2 9 0 Q2 2 0 9 Q-2 2 -9 0 Q-2 -2 0 -9Z';
const verses = ['夜空为画布展开幻梦，', '月光为画笔指引方向，', '星光为贴纸点缀夜空，', '请开始月与星的共行'];
const positions = [[.12,.24],[.82,.19],[.67,.38],[.27,.45],[.89,.58],[.38,.14],[.57,.68],[.17,.73],[.73,.79],[.91,.35],[.44,.31],[.32,.66]];

export default function StarMoonScene({ kind, reduced, routeReady, destination, onCovered, onFinish }: {
  kind: SceneKind; reduced: boolean; routeReady: boolean; destination: string; onCovered: () => void; onFinish: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const gate = useRef<ReturnType<typeof createSceneExitGate> | null>(null);
  const requestExit = useRef<(() => void) | null>(null);
  const [awaitingExit, setAwaitingExit] = useState(false);
  const callbacks = useRef({ onCovered, onFinish });
  const [size] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => { gate.current?.setReady(routeReady); }, [routeReady]);
  useEffect(() => { callbacks.current = { onCovered, onFinish }; }, [onCovered, onFinish]);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    skip.current?.focus();
    const resize = () => {
      // Rotation finishes the current story instead of rebuilding transforms mid-morph.
      if (Math.abs(window.innerWidth - size.w) > 80 || Math.abs(window.innerHeight - size.h) > 120) requestExit.current?.();
    };
    window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('resize', resize); };
  }, [size]);

  const { w, h } = size;
  const mobile = w <= 640;
  const cx = w / 2, cy = h * .35;
  const edge = mobile ? 8 : 14;
  const sideY = mobile ? 72 : 86;
  const sweep = Math.min(210, w * .34);
  const freePath = `M${cx-sweep} ${cy+20} C${cx-sweep*.55} ${cy-90} ${cx+sweep*.55} ${cy+115} ${cx+sweep*.2} ${cy+10} S${cx-sweep*.2} ${cy-100} ${cx+sweep} ${cy+5}`;
  const caption = kind === 'paint' ? verses : kind === 'free'
    ? ['不必循着既定的轨迹', '选一种颜色，从你的第一笔开始']
    : ['沿着星光，开始创作'];
  useGSAP((_context, contextSafe) => {
    if (!root.current) return;
    let closing = false;
    let requested = false;
    const exit = contextSafe!(() => {
      closing = true;
      timeline.current?.pause();
      gsap.to(root.current, { opacity: 0, duration: reduced ? .08 : .4, ease: 'power2.inOut', onComplete: () => callbacks.current.onFinish() });
    });
    const exitGate = createSceneExitGate(exit);
    gate.current = exitGate;
    exitGate.setReady(routeReady);
    const complete = () => {
      if (closing || requested) return;
      requested = true;
      timeline.current?.pause();
      callbacks.current.onCovered();
      setAwaitingExit(true);
      exitGate.requestExit();
    };
    requestExit.current = complete;
    if (reduced) {
      complete();
      return () => { exitGate.dispose(); gate.current = null; requestExit.current = null; };
    }
    const select = gsap.utils.selector(root);
    const sequence = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: .5 }, onComplete: complete });
    timeline.current = sequence;
    gsap.set(select('.scene-star'), { opacity: 0, scale: .2, transformOrigin: '50% 50%' });
    gsap.set(select('.scene-verse'), { opacity: 0, y: 14 });
    if (kind !== 'free') gsap.set(select('.scene-moon'), { opacity: 0, scale: .6, svgOrigin: '0 0' });
    sequence.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: .18 }, 0);
    sequence.call(() => callbacks.current.onCovered(), [], .25);
    sequence.to(select('.scene-star'), { opacity: .75, scale: 1, stagger: .045, duration: .45 }, .45);
    // Two slow glints per star, never a rapid flashing particle field.
    sequence.to(select('.scene-glint'), { opacity: 1, scale: 1.65, transformOrigin: '50% 50%', stagger: .055, duration: .25, repeat: 1, yoyo: true }, .7);
    if (kind === 'create') {
      const aperture = select('.scene-aperture');
      sequence.fromTo(aperture, { scale: Math.hypot(w, h) / 70, opacity: 1, svgOrigin: `${cx} ${cy}` }, { scale: 1, duration: .95, ease: 'power3.out' }, 0);
      sequence.to(aperture, { opacity: 0, duration: .35 }, .7);
      sequence.to(select('.scene-moon'), { opacity: 1, scale: 1, duration: .55 }, .55);
      sequence.fromTo(select('.scene-road'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.3 }, 1);
      const path = root.current.querySelector<SVGPathElement>('.scene-road');
      const traveller = root.current.querySelector<SVGGElement>('.scene-traveller');
      if (path && traveller) {
        const length = path.getTotalLength();
        const journey = { progress: 0 };
        sequence.to(journey, { progress: 1, duration: 1.5, ease: 'power2.inOut', onUpdate: () => {
          const point = path.getPointAtLength(journey.progress * length);
          traveller.setAttribute('transform', `translate(${point.x} ${point.y})`);
        } }, 1.15);
        sequence.fromTo(traveller, { opacity: 0 }, { opacity: 1, duration: .2 }, 1.15);
        sequence.to(traveller, { opacity: 0, duration: .25 }, 2.6);
      }
      sequence.to(select('.scene-verse'), { opacity: 1, y: 0, stagger: .1, duration: .4 }, 1.45);
      sequence.to(select('.scene-moon'), { scale: 1.12, duration: .7 }, 2.65);
      sequence.to(select('.scene-verse'), { opacity: 0, y: -8, duration: .25 }, 3.45);
      sequence.to({}, { duration: .15 }, 3.45);
    } else if (kind === 'free') {
      const path = root.current.querySelector<SVGPathElement>('.scene-free-ink');
      const tip = root.current.querySelector<SVGGElement>('.scene-free-tip');
      sequence.fromTo(select('.scene-free-nib'), { opacity: 0, y: -70, scale: .5 }, { opacity: 1, y: 0, scale: 1, svgOrigin: '0 0', duration: .6, ease: 'power2.out' }, .25);
      sequence.fromTo(select('.scene-free-color'), { opacity: 0, scale: .3 }, { opacity: 1, scale: 1, transformOrigin: '50% 50%', stagger: .12, duration: .4 }, .85);
      if (path && tip) {
        const length = path.getTotalLength();
        const drawing = { progress: 0 };
        const render = () => {
          const point = path.getPointAtLength(drawing.progress * length);
          path.style.strokeDashoffset = String(1 - drawing.progress);
          tip.setAttribute('transform', `translate(${point.x} ${point.y})`);
        };
        render();
        // The leading star and visible ink share a single progress value.
        sequence.to(drawing, { progress: 1, ease: 'sine.inOut', duration: 1.65, onUpdate: render }, .9);
      }
      sequence.to(select('.scene-verse'), { opacity: 1, y: 0, stagger: .13, duration: .4 }, 1.55);
      sequence.to(select('.scene-free-nib'), { opacity: 0, scale: .6, duration: .3 }, 2.65);
      sequence.to(select('.scene-free-ink, .scene-free-color'), { opacity: .3, duration: .45 }, 2.8);
      sequence.to(select('.scene-verse'), { opacity: 0, y: -6, stagger: .08, duration: .25 }, 3.25);
      sequence.to({}, { duration: .1 }, 3.5);
    } else {
      sequence.to(select('.scene-moon'), { opacity: 1, scale: .65, duration: .4 }, .4);
      sequence.to(select('.scene-moon-shape'), { attr: { d: brush }, fill: '#8733ff', duration: .8, ease: 'sine.inOut' }, .75);
      sequence.to(select('.scene-moon'), { x: 55, y: 24, duration: .65, ease: 'sine.inOut' }, 1.55);
      sequence.fromTo(select('.scene-brush-line'), { strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: .65, ease: 'sine.inOut' }, 1.55);
      const stars = select('.scene-star');
      const targets = [[edge + 26, sideY + 26], [edge + 26, sideY + 71], [edge + 26, sideY + 116], [edge + 26, sideY + 161], [edge + 30, 36], [edge + 116, 36], [w-edge-116,36], [w-edge-71,36], [w-edge-26,36]];
      stars.forEach((element, i) => {
        const [tx, ty] = targets[i % targets.length];
        sequence.to(element, { x: tx - positions[i][0] * w, y: ty - positions[i][1] * h, scale: .65, opacity: 1, duration: .65 }, 1.35 + i * .035);
        sequence.to(element, { opacity: 0, duration: .2 }, 2.08 + i * .035);
      });
      sequence.fromTo(select('.scene-material-tool'), { opacity: 0, scale: .85 }, { opacity: 1, scale: 1, transformOrigin: '50% 50%', duration: .3 }, 1.97);
      sequence.fromTo(select('.scene-tool-rest'), { opacity: 0 }, { opacity: 1, stagger: .07, duration: .35 }, 2.13);
      sequence.to(select('.scene-verse'), { opacity: 1, y: 0, stagger: .1, duration: .3 }, 1.85);
      sequence.to(select('.scene-moon, .scene-brush-line'), { opacity: 0, duration: .4 }, 2.65);
      sequence.to(select('.scene-verse'), { opacity: 0, y: -6, stagger: .04, duration: .28 }, 3.4);
      sequence.to(select('.scene-material-tool, .scene-tool-rest'), { opacity: 0, duration: .25 }, 3.55);
      sequence.to({}, { duration: .4 }, 3.4);
    }
    const visibility = () => { if (!closing && !requested) sequence.paused(document.hidden); };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => { exitGate.dispose(); gate.current = null; requestExit.current = null; timeline.current = null; document.removeEventListener('visibilitychange', visibility); };
  }, { scope: root, dependencies: [kind, reduced], revertOnUpdate: true });

  function skipScene() { requestExit.current?.(); }
  return createPortal(<div ref={root} className="star-scene" role="dialog" aria-modal="true" aria-label={kind === 'create' ? '沿星路进入创作页' : kind === 'free' ? '自由落笔的创作开场' : '月与星的共创开场'} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); skipScene(); }
    if (event.key === 'Tab' && !(awaitingExit && !routeReady)) { event.preventDefault(); skip.current?.focus(); }
  }}>
    <button ref={skip} type="button" className="scene-skip" onClick={skipScene}>跳过动画</button>
    {awaitingExit && !routeReady && <div className="scene-wait" role="status">正在打开页面…<a href={destination}>直接进入</a></div>}
    <svg className="scene-art" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      {kind === 'create' ? <>
        <rect className="scene-aperture" x={cx-75} y={cy-75} width="150" height="150" rx="75" fill="#333" />
        <path className="scene-road" d={`M${w*.18} ${h+20} C${w*.85} ${h*.83} ${w*.13} ${h*.6} ${cx} ${cy+85}`} pathLength="1" strokeDasharray="1" stroke="#9b68ec" strokeWidth="2" fill="none" />
        <g className="scene-traveller" opacity="0"><path d={star} fill="#fff" /><circle r="15" stroke="#b296e2" opacity=".4" fill="none" /></g>
      </> : kind === 'free' ? <>
        <path className="scene-free-ink" d={freePath} fill="none" stroke="#b48aff" strokeWidth={mobile ? 3 : 4} strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
        <g className="scene-free-tip" transform={`translate(${cx-sweep} ${cy+20})`}><g className="scene-free-nib"><path d={star} fill="#f5f5f5" /><circle r="14" fill="none" stroke="#b48aff" strokeWidth="1" opacity=".45" /></g></g>
        {['#b48aff', '#86caba', '#edc884'].map((color, index) => <circle className="scene-free-color" key={color} cx={cx+(index-1)*28} cy={cy+110} r="5" fill={color} />)}
      </> : <>
        <path className="scene-brush-line" d={`M${cx-29.9} ${cy+37.7} L${cx+25.1} ${cy+61.7}`} fill="none" stroke="#8733ff" strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" />
      </>}
      {kind !== 'free' && <g transform={`translate(${cx} ${cy})`}><g className="scene-moon"><path className="scene-moon-shape" d={moon} fill="#eeeae3" /></g></g>}
      {positions.map(([x,y],i) => <g key={i} transform={`translate(${x*w} ${y*h})`}><g className="scene-star"><circle r="1.4" fill="#fff" /><path className="scene-glint" d={star} fill={i%4===0?'#b296e2':'#f3f1ec'} opacity=".4" /></g></g>)}
      {kind === 'paint' && <g strokeWidth="1.6" color="#ddd">
        <g className="scene-material-tool"><rect x={edge} y={sideY} width="52" height="52" rx="8" fill="#282828" /><Shapes x={edge+16} y={sideY+16} size={20} /></g>
        <g className="scene-tool-rest"><rect x={edge} y={sideY+52} width="52" height="138" rx="8" fill="#282828" />{[Move,Timer,RotateCcw].map((Icon,i)=><Icon key={i} x={edge+16} y={sideY+61+i*45} size={20} />)}</g>
        <g className="scene-tool-rest"><rect x={edge} y="14" width={mobile?Math.min(174,w-177):214} height="44" rx="8" fill="#282828" /><ArrowLeft x={edge+12} y="27" size={18}/><text x={edge+38} y="42" fill="currentColor" stroke="none" fontSize="12">创作入口</text><Images x={edge+112} y="27" size={18}/>{!mobile&&<text x={edge+138} y="42" fill="currentColor" stroke="none" fontSize="12">我的星图</text>}</g>
        <g className="scene-tool-rest"><rect x={w-edge-145} y="14" width="145" height="52" rx="8" fill="#282828" />{[Palette,Image,Save].map((Icon,i)=><Icon key={i} x={w-edge-128+i*45} y="30" size={20}/>)}</g>
      </g>}
    </svg>
    <div className="scene-caption" aria-hidden="true">{caption.map(line=><div className="scene-line" key={line}><p className="scene-verse">{line}</p></div>)}</div>
    <p className="sr-only">{caption.join('。')}可跳过动画。</p>
  </div>, document.body);
}
