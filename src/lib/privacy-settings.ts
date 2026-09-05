export const PRIVACY_STORAGE_KEY = 'startrace-privacy-v1';
export const CONSENT_VERSION = '2026-09-04-v1';

export interface PrivacyPreferences {
  version: 1;
  researchConsent: boolean;
  artworkCloudUpload: boolean;
  consentVersion: string;
  consentedAt: string | null;
  participantId: string | null;
}

export interface ResearchEnvelope {
  participantId: string;
  researchConsent: true;
  consentVersion: string;
  consentedAt: string;
  studyId: 'startrace-novice-pilot';
  studyCondition: 'unassigned';
  sessionKind: 'voluntary';
  studyPhase: 'exploration';
}

const DEFAULT_PREFERENCES: PrivacyPreferences = {
  version: 1,
  researchConsent: false,
  artworkCloudUpload: false,
  consentVersion: CONSENT_VERSION,
  consentedAt: null,
  participantId: null,
};

function createParticipantId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function loadPrivacyPreferences(): PrivacyPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<PrivacyPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      version: 1,
      researchConsent: parsed.researchConsent === true,
      artworkCloudUpload: parsed.artworkCloudUpload === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function updatePrivacyPreferences(patch: Partial<Pick<PrivacyPreferences, 'researchConsent' | 'artworkCloudUpload'>>): PrivacyPreferences {
  const current = loadPrivacyPreferences();
  const enablingResearch = patch.researchConsent === true && !current.researchConsent;
  const needsParticipantId = (patch.researchConsent === true || patch.artworkCloudUpload === true) && !current.participantId;
  const next: PrivacyPreferences = {
    ...current,
    ...patch,
    version: 1,
    consentVersion: CONSENT_VERSION,
    consentedAt: enablingResearch ? new Date().toISOString() : current.consentedAt,
    participantId: needsParticipantId ? createParticipantId() : current.participantId,
  };
  localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('startrace-privacy-updated'));
  return next;
}

export function getResearchEnvelope(): ResearchEnvelope | null {
  const preferences = loadPrivacyPreferences();
  if (!preferences.researchConsent || !preferences.participantId || !preferences.consentedAt) return null;
  return {
    participantId: preferences.participantId,
    researchConsent: true,
    consentVersion: preferences.consentVersion,
    consentedAt: preferences.consentedAt,
    studyId: 'startrace-novice-pilot',
    studyCondition: 'unassigned',
    sessionKind: 'voluntary',
    studyPhase: 'exploration',
  };
}

export function clearLocalStarTraceData() {
  if (typeof window === 'undefined') return;
  [
    'star-bindpaint-gallery',
    'star-bindpaint-settings',
    'startrace-interface-settings-v1',
    'startrace-practice-profile-v1',
    PRIVACY_STORAGE_KEY,
  ].forEach(key => localStorage.removeItem(key));

  const transientKeys: string[] = [];
  for (let index = 0; index < sessionStorage.length; index++) {
    const key = sessionStorage.key(index);
    if (key?.startsWith('star-bindpaint-') || key?.startsWith('startrace-')) transientKeys.push(key);
  }
  transientKeys.forEach(key => sessionStorage.removeItem(key));
}
