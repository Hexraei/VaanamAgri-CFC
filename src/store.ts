const KEY = 'vaanam.selection.v1';

export interface Selection {
  panchayatId: string | null;
  crop: string;
  stage: string;
}

export function loadSelection(): Selection {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { panchayatId: null, crop: 'paddy', stage: 'tillering' };
}

export function saveSelection(sel: Selection) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sel));
  } catch { /* ignore */ }
}
