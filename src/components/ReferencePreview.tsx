'use client';
/* eslint-disable @next/next/no-img-element */
import { useRef } from 'react';
import { Maximize2, X } from 'lucide-react';

export default function ReferencePreview({ src }: { src: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" aria-label="全屏查看参考原图" onClick={() => dialog.current?.showModal()} className="group block w-full overflow-hidden rounded-xl border border-[#D9DDEA] bg-[#F6F7FB] text-left">
      <img src={src} alt="参考原图" draggable={false} className="block max-h-[min(190px,25dvh)] w-full object-contain" />
      <span className="flex items-center justify-between gap-2 px-2 py-1.5 text-[10px] font-bold text-[#536079]">参考原图 · 点击放大<Maximize2 size={13} /></span>
    </button>
    <dialog ref={dialog} aria-label="参考原图全屏预览" className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overscroll-contain border-0 bg-[#101827]/95 p-0 text-white backdrop:bg-[#101827]/95">
      <div className="relative flex h-full w-full flex-col p-4 sm:p-6">
        <div className="flex shrink-0 items-center justify-between gap-3 pb-4">
          <span className="text-sm font-bold">参考原图</span>
          <button type="button" autoFocus aria-label="收起原图，返回提示卡" onClick={() => dialog.current?.close()} className="flex min-h-11 items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 text-sm font-bold"><X size={18} />返回画板</button>
        </div>
        <button type="button" aria-label="点击原图恢复到提示卡" onClick={() => dialog.current?.close()} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-[#FFD166]">
          <img src={src} alt="放大的参考原图" draggable={false} className="h-full w-full object-contain" />
        </button>
        <p className="shrink-0 pt-3 text-center text-xs text-white/70">点击画面或按 Esc，返回提示卡</p>
      </div>
    </dialog>
  </>;
}
