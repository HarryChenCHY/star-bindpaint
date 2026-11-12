'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';

export default function StudyArtworkSave({ save }: { save: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  return <section className="creation-card">
    <h2>保存本轮进度</h2>
    <p className="creation-note">系统会自动保存画面。你也可以手动保存，再继续创作。</p>
    <button type="button" disabled={saving} onClick={async () => {
      setSaving(true);
      try { await save(); } finally { setSaving(false); }
    }}><Save size={16} />{saving ? '正在保存…' : '保存当前画面'}</button>
  </section>;
}
