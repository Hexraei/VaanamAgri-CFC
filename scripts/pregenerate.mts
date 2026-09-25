// Pre-generates advisories for the demo panchayats x crops and commits them
// as data/fallback/*.json. Two uses:
//   1. Demo safety - if Open-Meteo or Gemini hiccups while judges watch,
//      /api/advisory serves the committed snapshot (header X-Vaanam-Fallback).
//   2. Freshness - the GitHub Action runs this every 6 hours.
// Run: node --experimental-strip-types scripts/pregenerate.mts
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fetchCells, fetchElevation } from '../api/_openmeteo.ts';
import { downscale, neighbourPoints } from '../api/_downscale.ts';
import { evaluateRules } from '../api/_rules.ts';
import { buildFallbackSummary, buildGeminiPrompt, generateWithGemini } from '../api/_advisory.ts';

const root = new URL('..', import.meta.url).pathname;
const panchayats = JSON.parse(String(readFileSync(join(root, 'data/panchayats.json')))).panchayats;
const crops = JSON.parse(String(readFileSync(join(root, 'data/crops.json')))).crops;
import { readFileSync } from 'node:fs';

const DEMO = [
  ['tn-thanjavur-orathanadu', 'paddy', 'tillering'],
  ['tn-thanjavur-orathanadu', 'paddy', 'flowering'],
  ['tn-thanjavur-papanasam', 'paddy', 'tillering'],
  ['tn-thanjavur-kumbakonam', 'banana', 'bunching'],
  ['tn-madurai-melur', 'groundnut', 'pegging'],
  ['tn-coimbatore-pollachi', 'banana', 'vegetative'],
  ['ap-guntur-guntur', 'paddy', 'transplanting'],
  ['ka-mandya-mandya', 'paddy', 'tillering']
] as const;

const apiKey = process.env.GEMINI_API_KEY;
mkdirSync(join(root, 'data/fallback'), { recursive: true });

for (const [pid, cropId, stageId] of DEMO) {
  const p = panchayats.find((x: any) => x.id === pid);
  const crop = crops.find((c: any) => c.id === cropId);
  try {
    const [cells, elev] = await Promise.all([fetchCells(neighbourPoints(p.lat, p.lng)), fetchElevation(p.lat, p.lng)]);
    const days = downscale(cells, { lat: p.lat, lng: p.lng }, elev);
    const actions = evaluateRules(crop, stageId, days);
    let advisory: any;
    if (apiKey) {
      const g = await generateWithGemini(apiKey, buildGeminiPrompt(p, crop, stageId, days, actions));
      advisory = { panchayat: p, crop: cropId, stage: stageId, lang: 'ta', generatedAt: new Date().toISOString(), generatedBy: 'gemini', summaryEn: g.summary_en, summaryTa: g.summary_ta, actions: g.actions.map((a: any, i: number) => ({ ruleId: actions[i]?.ruleId ?? `gemini-${i}`, severity: actions[i]?.severity ?? 'info', en: a.en, ta: a.ta })), forecastDays: days };
    } else {
      const fb = buildFallbackSummary(p, crop, stageId, days, actions);
      advisory = { panchayat: p, crop: cropId, stage: stageId, lang: 'ta', generatedAt: new Date().toISOString(), generatedBy: 'rules', summaryEn: fb.summaryEn, summaryTa: fb.summaryTa, actions, forecastDays: days };
    }
    writeFileSync(join(root, 'data/fallback', `${pid}__${cropId}__${stageId}.json`), JSON.stringify(advisory, null, 2));
    console.log('ok', pid, cropId, stageId, `(${actions.length} actions)`);
    await new Promise((r) => setTimeout(r, 400));
  } catch (e: any) {
    console.log('FAIL', pid, cropId, stageId, e?.message);
  }
}
