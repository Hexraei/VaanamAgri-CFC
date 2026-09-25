// Advisory generation. Two paths:
//  1. Gemini (when GEMINI_API_KEY is set): the forecast + fired rules go into
//     a constrained prompt; Gemini writes the farmer-facing summary in Tamil
//     and English. Structured JSON output only.
//  2. Deterministic fallback (no key / API error): the same fired rules are
//     composed into template sentences. This powers the pre-generated demo
//     data and guarantees the live demo can never blank.

import type { Advisory, AdvisoryAction, DayForecast, Panchayat } from './_types.js';
import type { Crop } from './_rules.js';

// Ordered model chain: first that answers wins. Gemini 3.x flash models
// spike to 503 UNAVAILABLE under demand; 3.1-flash-lite is the reliable
// backup. gemini-2.5-flash is retired for new API keys (404).
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite'];

export function buildFallbackSummary(
  panchayat: Panchayat,
  crop: Crop,
  stageId: string,
  days: DayForecast[],
  actions: AdvisoryAction[]
): { summaryEn: string; summaryTa: string } {
  const stage = crop.stages.find((s) => s.id === stageId);
  const today = days[0];
  const rainLine =
    today.precipMm >= 5
      ? `Rain expected today (${today.precipMm} mm).`
      : today.precipMm >= 1
        ? `Light rain possible today (${today.precipMm} mm).`
        : `No rain expected today.`;
  const rainLineTa =
    today.precipMm >= 5
      ? `இன்று மழை எதிர்பார்க்கப்படுகிறது (${today.precipMm} மிமீ).`
      : today.precipMm >= 1
        ? `இன்று லேசான மழை சாத்தியம் (${today.precipMm} மிமீ).`
        : `இன்று மழை எதிர்பார்க்கப்படவில்லை.`;
  const top = actions[0];
  return {
    summaryEn:
      `${panchayat.name}: ${crop.name_en} at ${stage?.name_en ?? stageId} stage. ` +
      `${rainLine} High ${today.tmax}°C, low ${today.tmin}°C.` +
      (top ? ` Priority: ${top.en}` : ' Conditions look normal - follow your regular schedule.'),
    summaryTa:
      `${panchayat.name_ta}: ${crop.name_ta} ${stage?.name_ta ?? stageId} நிலையில். ` +
      `${rainLineTa} அதிகபட்சம் ${today.tmax}°செ, குறைந்தபட்சம் ${today.tmin}°செ.` +
      (top ? ` முக்கியம்: ${top.ta}` : ' நிலை சாதாரணம் - வழக்கமான பணிகளைத் தொடரவும்.')
  };
}

export function buildGeminiPrompt(
  panchayat: Panchayat,
  crop: Crop,
  stageId: string,
  days: DayForecast[],
  actions: AdvisoryAction[]
): string {
  const stage = crop.stages.find((s) => s.id === stageId);
  return [
    `You are an agricultural extension officer writing a daily advisory for a farmer in ${panchayat.name}, ${panchayat.district}, Tamil Nadu.`,
    `Crop: ${crop.name_en} (${crop.name_ta}), stage: ${stage?.name_en} (${stage?.name_ta}).`,
    `Write for a farmer with low literacy: short sentences, concrete actions, no jargon.`,
    `5-day panchayat-level forecast (downscaled from model grid):`,
    JSON.stringify(days),
    `Agronomy rules that fired (you MUST include these actions, you may reorder by urgency):`,
    JSON.stringify(actions.map((a) => ({ en: a.en, ta: a.ta, severity: a.severity }))),
    `Respond as JSON with exactly these keys:`,
    `{"summary_ta": string (2-3 sentences, Tamil), "summary_en": string (2-3 sentences, English), "actions": [{"ta": string, "en": string}]}`,
    `If no rules fired, give at most 2 general stage-appropriate tips. Never invent weather numbers beyond the forecast given.`
  ].join('\n');
}

export async function generateWithGemini(
  apiKey: string,
  prompt: string
): Promise<{ summary_ta: string; summary_en: string; actions: Array<{ ta: string; en: string }> }> {
  let lastErr = 'gemini: no models configured';
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
          })
        }
      );
      if (!res.ok) throw new Error(`gemini ${res.status} (${model})`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error(`gemini empty response (${model})`);
      return JSON.parse(text);
    } catch (e: any) {
      lastErr = String(e?.message ?? e);
    }
  }
  throw new Error(lastErr);
}
