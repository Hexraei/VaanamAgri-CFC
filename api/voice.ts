// Speak exactly the Tamil advisory the farmer is viewing. Never select audio
// from a crop/stage key: forecasts and Gemini wording change between requests.
import { EdgeTTS } from 'node-edge-tts';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

const cache = new Map<string, { bytes: Buffer; at: number }>();
const MAX_TEXT = 2200;
const MAX_CACHE = 32;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let payload: any;
  try { payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid JSON' }); }
  const text = payload?.text;
  const lang = payload?.lang === 'en' ? 'en' : 'ta';
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT || (lang === 'ta' && !/[\u0B80-\u0BFF]/u.test(text))) {
    return res.status(400).json({ error: 'Advisory text required (max 2200 characters; Tamil for ta)' });
  }
  const clean = text.trim();
  const hash = createHash('sha256').update(lang + ':' + clean).digest('hex');
  let entry = cache.get(hash);
  try {
    if (!entry || Date.now() - entry.at > 30 * 60_000) {
      const file = join(tmpdir(), `vaanam-${randomUUID()}.mp3`);
      let bytes: Buffer;
      try {
        const voice = lang === 'ta' ? 'ta-IN-PallaviNeural' : 'en-IN-NeerjaNeural';
        await new EdgeTTS({ voice, lang: lang === 'ta' ? 'ta-IN' : 'en-IN', timeout: 12000 }).ttsPromise(clean, file);
        bytes = await readFile(file);
      } finally {
        await unlink(file).catch(() => {});
      }
      if (!bytes.length) throw new Error('empty audio');
      entry = { bytes, at: Date.now() };
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
      cache.set(hash, entry);
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Vaanam-Text-SHA256', hash);
    return res.status(200).send(entry.bytes);
  } catch {
    return res.status(502).json({ error: 'natural Tamil voice unavailable' });
  }
                                                                  }
