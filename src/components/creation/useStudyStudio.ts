'use client';

import { useImperativeHandle, useRef, type Ref } from 'react';
import { loadLocalImage, whiteCanvas } from '@/lib/co-create';
import { MATERIAL_LIBRARY } from '@/lib/material-library';
import type useMaterialLayout from './useMaterialLayout';
import type { MaterialPlacement } from './useMaterialLayout';

type MaterialLayout = ReturnType<typeof useMaterialLayout>;
type Snapshot = { image?: string; reference?: string | null; draftImage?: string | null; layout?: string };

export type StudyStudioHandle = {
  pause: () => void;
  captureQuick: () => Snapshot;
  capture: () => Promise<Snapshot>;
};

export type StudyStudioOptions = {
  handle: Ref<StudyStudioHandle>;
  photo: string;
  allowLayout: boolean;
  resumeImage?: string;
  resumeReference?: string;
  resumeLayout?: string;
  onEvent: (type: string, detail?: string) => void;
  onSave: () => Promise<void>;
};

export async function loadStudyCanvas(source?: string) {
  const canvas = whiteCanvas(640, 480);
  if (source) {
    const image = await loadLocalImage(source);
    const scale = Math.min(640 / image.naturalWidth, 480 / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    canvas.getContext('2d')!.drawImage(image, (640 - width) / 2, (480 - height) / 2, width, height);
  }
  return canvas;
}

function readLayout(saved?: string): { pending: MaterialPlacement[]; confirmed: MaterialPlacement[][] } {
  try {
    const data = JSON.parse(saved ?? '{}');
    return {
      pending: Array.isArray(data.pending) ? data.pending.filter((item: MaterialPlacement | null) =>
        item && typeof item.id === 'string' && [item.x, item.y, item.width, item.height, item.rotation, item.variation].every(Number.isFinite) && item.width > 0 && item.height > 0) : [],
      confirmed: Array.isArray(data.confirmed) ? data.confirmed.filter(Array.isArray) : [],
    };
  } catch {
    return { pending: [], confirmed: [] };
  }
}

export default function useStudyStudio(
  study: StudyStudioOptions | undefined,
  layout: MaterialLayout,
  getCanvas: () => HTMLCanvasElement | null,
  getReference: () => HTMLCanvasElement | null,
  pause: () => void,
) {
  const confirmed = useRef(readLayout(study?.resumeLayout).confirmed);

  function restoreLayout() {
    if (!study?.allowLayout || !study.resumeLayout) return;
    const pending = readLayout(study.resumeLayout).pending.flatMap(placement => {
      const material = placement.materialId === 'initial-photo'
        ? { id: 'initial-photo', label: '照片', kind: 'uploaded' as const, src: study.photo, ratio: placement.width / placement.height, color: '#fff' }
        : MATERIAL_LIBRARY.find(item => item.material.id === placement.materialId)?.material;
      return material ? [{ placement, material }] : [];
    });
    layout.restore(pending);
  }

  function confirmLayout(labels: string[], placements: MaterialPlacement[]) {
    if (!study) return;
    confirmed.current = [...confirmed.current, placements];
    study.onEvent('layout_confirmed', labels.join('、'));
    if (placements.some(placement => placement.materialId !== 'initial-photo')) {
      study.onEvent('material_layout_confirmed');
    }
  }

  function captureQuick(): Snapshot {
    const canvas = getCanvas();
    if (!canvas) return {};
    const copy = whiteCanvas(640, 480);
    copy.getContext('2d')!.drawImage(canvas, 0, 0);
    const reference = getReference();
    const snapshot: Snapshot = {
      image: copy.toDataURL('image/jpeg', .87),
      reference: reference ? reference.toDataURL('image/jpeg', .87) : null,
    };
    if (study?.allowLayout) {
      const pending = layout.snapshot();
      const history = confirmed.current.flat().slice(-85);
      snapshot.layout = JSON.stringify({ pending: pending.slice(0, 60), confirmed: history.length ? [history] : [] });
    }
    return snapshot;
  }

  useImperativeHandle(study?.handle, () => ({
    pause,
    captureQuick,
    capture: async () => {
      const snapshot = captureQuick();
      if (!snapshot.image) return snapshot;
      const draftImage = study?.allowLayout && layout.pending ? await layout.preview().catch(() => undefined) : null;
      return { ...snapshot, draftImage };
    },
  }));

  return { restoreLayout, confirmLayout };
}
