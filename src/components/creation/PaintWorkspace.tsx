'use client';

import { useState, type ReactNode } from 'react';
import CoCreationStudio from './CoCreationStudio';
import FreeDrawingStudio from './FreeDrawingStudio';
import StudioSession from './StudioSession';
import type { StudyStudioOptions } from './useStudyStudio';

export type PaintEntry = { mode: 'free' | 'co-create'; source: string | null };

export default function PaintWorkspace({ entry, header, study, locked = false, children }: {
  entry: PaintEntry | null;
  header: ReactNode;
  study?: StudyStudioOptions;
  locked?: boolean;
  children?: ReactNode;
}) {
  const [revision, setRevision] = useState(0);
  const manual = entry?.mode === 'free';
  const options = revision && study
    ? { ...study, resumeImage: undefined, resumeReference: undefined, resumeLayout: undefined }
    : study;

  function reset() {
    study?.onEvent('studio_reset');
    setRevision(value => value + 1);
  }

  return <div className={`studio-page ${manual ? 'paint-classic' : 'creation-shell'}${study ? ' study-studio' : ''}`}>
    <header className={`creation-header${study ? ' study-studio-header' : ''}`}>{header}</header>
    <main className={manual ? 'free-studio-container' : 'creation-container'} inert={locked}>
      <StudioSession key={revision} study={Boolean(study)}>
        {entry ? manual
          ? <FreeDrawingStudio onReset={reset} study={options} />
          : <CoCreationStudio source={entry.source} onReset={reset} study={options} />
          : <p role="status">正在打开画布…</p>}
      </StudioSession>
    </main>
    {children}
  </div>;
}
