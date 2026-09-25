import { fetchCells, fetchElevation } from '../lib/openmeteo';
import { downscale, neighbourPoints } from '../lib/downscale';
import { evaluateRules, type Crop } from '../lib/rules';
import { buildFallbackSummary, buildGeminiPrompt, generateWithGemini } from '../lib/advisory';
import { panchayats, crops, fallbacks } from './_data';
import type { Advisory } from '../lib/types';

// In-warm-instance cache: panchayat+crop+stage -> advisory (30 min TTL)
const cache = new Map<string, { at: number; advisory: Advisory }>();
const TTL_MS = 30 * 60 * 1000;

export default async function handler(req: any, res: any) {
  const id = String(req.query?.panchayat ?? '');
  const cropId = String(req.query?.crop ?? 'paddy');
  const stageId = String(req.query?.stage ?? 'tillering');
  const p = panchayats.find((x) => x.id === id);
  const crop = crops.find((c) => c.id === cropId);
  if (!p) return res.status(404).json({ error: 'unknown panchayat', id });
  if (!crop) return res.status(404).json({ error: 'unknown crop', crop: cropId });
  if (!crop.stages.some((s) => s.id === stageId))
    return res.status(404).json({ error: 'unknown stage for crop', stage: stageId });

  const key = `${id}:${cropId}:${stageId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return res.status(200).json(hit.advisory);

  try {
    const [cells, elevation] = await Promise.all([
      fetchCells(neighbourPoints(p.lat, p.lng)),
      fetchElevation(p.lat, p.lng)
    ]);
    const days = downscale(cells, { lat: p.lat, lng: p.lng }, elevation);
    const actions = evaluateRules(crop, stageId, days);

    let advisory: Advisory;
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const g = await generateWithGemini(
          apiKey,
          buildGeminiPrompt(p, crop, stageId, days, actions)
        );
        advisory = {
          panchayat: p,
          crop: cropId,
          stage: stageId,
          lang: 'ta',
          generatedAt: new Date().toISOString(),
          generatedBy: 'gemini',
          summaryEn: g.summary_en,
          summaryTa: g.summary_ta,
          actions: g.actions.map((a, i) => ({
            ruleId: actions[i]?.ruleId ?? `gemini-${i}`,
            severity: actions[i]?.severity ?? 'info',
            en: a.en,
            ta: a.ta
          })),
          forecastDays: days
        };
      } catch {
        const fb = buildFallbackSummary(p, crop, stageId, days, actions);
        advisory = {
          panchayat: p, crop: cropId, stage: stageId, lang: 'ta',
          generatedAt: new Date().toISOString(), generatedBy: 'rules',
          summaryEn: fb.summaryEn, summaryTa: fb.summaryTa, actions, forecastDays: days
        };
      }
    } else {
      const fb = buildFallbackSummary(p, crop, stageId, days, actions);
      advisory = {
        panchayat: p, crop: cropId, stage: stageId, lang: 'ta',
        generatedAt: new Date().toISOString(), generatedBy: 'rules',
        summaryEn: fb.summaryEn, summaryTa: fb.summaryTa, actions, forecastDays: days
      };
    }
    cache.set(key, { at: Date.now(), advisory });
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(advisory);
  } catch (e: any) {
    // last-resort: serve the committed pre-generated fallback if one exists
    const committed = fallbacks[`${id}__${cropId}__${stageId}`];
    if (committed) {
      res.setHeader('X-Vaanam-Fallback', 'committed');
      return res.status(200).json(committed);
    }
    return res.status(502).json({ error: 'advisory generation failed', detail: String(e?.message ?? e) });
  }
}
