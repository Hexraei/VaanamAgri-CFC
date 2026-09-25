// Crop-doctor: farmer photographs a sick leaf; Gemini multimodal identifies
// the likely disease and suggests treatment in Tamil + English.

const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(503).json({
      error: 'diagnosis_unavailable',
      detail: 'GEMINI_API_KEY not configured on this deployment'
    });

  const { imageBase64, mimeType, crop } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

  const prompt = [
    `You are a plant pathologist helping a smallholder farmer in Tamil Nadu.`,
    crop ? `The crop is ${crop}.` : 'Identify the crop first.',
    `Look at this leaf photo. Respond as JSON with exactly these keys:`,
    `{"crop": string, "finding": string (disease/pest/deficiency name, or "healthy"), "confidence": "high"|"medium"|"low",`,
    ` "advice_ta": string (2-3 short sentences, Tamil, concrete treatment steps),`,
    ` "advice_en": string (2-3 short sentences, English, concrete treatment steps),`,
    ` "see_officer": boolean (true if this needs an agriculture officer, e.g. unknown or severe)}`,
    `If the photo is not a plant leaf, set finding to "not_a_leaf" and say what you see instead.`
  ].join('\n');

  let lastErr = 'gemini: no models configured';
  for (const model of GEMINI_MODELS) {
    try {
      const g = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType ?? 'image/jpeg', data: imageBase64 } }
                ]
              }
            ],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
          })
        }
      );
      if (!g.ok) throw new Error(`gemini ${g.status} (${model})`);
      const data = await g.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error(`gemini empty response (${model})`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(JSON.parse(text));
    } catch (e: any) {
      lastErr = String(e?.message ?? e);
    }
  }
  return res.status(502).json({ error: 'diagnosis failed', detail: lastErr });
}
