// Temporary deployment diagnostic: proves lib imports + static data bundle work
// inside a Vercel function without touching the network or fs.
import { neighbourPoints } from '../lib/downscale';
import { evaluateRules } from '../lib/rules';
import { buildFallbackSummary } from '../lib/advisory';
import { panchayats, crops, fallbacks } from './_data';

export default async function handler(_req: any, res: any) {
  return res.status(200).json({
    ok: true,
    neighbours: neighbourPoints(11.0254, 77.1246).length,
    evaluateRules: typeof evaluateRules,
    buildFallbackSummary: typeof buildFallbackSummary,
    panchayats: panchayats.length,
    crops: crops.length,
    fallbacks: Object.keys(fallbacks).length
  });
}
