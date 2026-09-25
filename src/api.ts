import type { Advisory, Panchayat, PanchayatForecast } from '../lib/types';

export async function getPanchayats(): Promise<Panchayat[]> {
  const r = await fetch('/api/panchayats');
  if (!r.ok) throw new Error('panchayats failed');
  return (await r.json()).panchayats;
}

export async function getForecast(id: string): Promise<PanchayatForecast> {
  const r = await fetch(`/api/forecast?panchayat=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error('forecast failed');
  return r.json();
}

export async function getAdvisory(id: string, crop: string, stage: string): Promise<Advisory> {
  const r = await fetch(
    `/api/advisory?panchayat=${encodeURIComponent(id)}&crop=${encodeURIComponent(crop)}&stage=${encodeURIComponent(stage)}`
  );
  if (!r.ok) throw new Error('advisory failed');
  return r.json();
}

export interface Diagnosis {
  crop: string;
  finding: string;
  confidence: 'high' | 'medium' | 'low';
  advice_ta: string;
  advice_en: string;
  see_officer: boolean;
}

export async function diagnose(imageBase64: string, mimeType: string, crop?: string): Promise<Diagnosis> {
  const r = await fetch('/api/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType, crop })
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error ?? 'diagnosis failed');
  }
  return r.json();
}
