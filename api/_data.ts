// Static data bundle for the serverless functions. Vercel's file tracing does
// not reliably include files read via fs at module scope (FUNCTION_INVOCATION_FAILED
// on cold start), so every JSON the API needs is imported statically and gets
// inlined into each function bundle at build time.
// NOTE: when scripts/pregenerate.mts adds new fallback snapshots, register them here.
import panchayatsJson from '../data/panchayats.json';
import cropsJson from '../data/crops.json';
import fbApGunturPaddyTransplanting from '../data/fallback/ap-guntur-guntur__paddy__transplanting.json';
import fbKaMandyaPaddyTillering from '../data/fallback/ka-mandya-mandya__paddy__tillering.json';
import fbTnCoimbatorePollachiBananaVegetative from '../data/fallback/tn-coimbatore-pollachi__banana__vegetative.json';
import fbTnMaduraiMelurGroundnutPegging from '../data/fallback/tn-madurai-melur__groundnut__pegging.json';
import fbTnThanjavurKumbakonamBananaBunching from '../data/fallback/tn-thanjavur-kumbakonam__banana__bunching.json';
import fbTnThanjavurOrathanaduPaddyFlowering from '../data/fallback/tn-thanjavur-orathanadu__paddy__flowering.json';
import fbTnThanjavurOrathanaduPaddyTillering from '../data/fallback/tn-thanjavur-orathanadu__paddy__tillering.json';
import fbTnThanjavurPapanasamPaddyTillering from '../data/fallback/tn-thanjavur-papanasam__paddy__tillering.json';
import type { Panchayat } from '../lib/types';
import type { Crop } from '../lib/rules';

export const panchayatsDoc = panchayatsJson as unknown as {
  source: string;
  panchayats: Panchayat[];
};
export const panchayats = panchayatsDoc.panchayats;
export const crops = cropsJson.crops as unknown as Crop[];

export const fallbacks: Record<string, unknown> = {
  'ap-guntur-guntur__paddy__transplanting': fbApGunturPaddyTransplanting,
  'ka-mandya-mandya__paddy__tillering': fbKaMandyaPaddyTillering,
  'tn-coimbatore-pollachi__banana__vegetative': fbTnCoimbatorePollachiBananaVegetative,
  'tn-madurai-melur__groundnut__pegging': fbTnMaduraiMelurGroundnutPegging,
  'tn-thanjavur-kumbakonam__banana__bunching': fbTnThanjavurKumbakonamBananaBunching,
  'tn-thanjavur-orathanadu__paddy__flowering': fbTnThanjavurOrathanaduPaddyFlowering,
  'tn-thanjavur-orathanadu__paddy__tillering': fbTnThanjavurOrathanaduPaddyTillering,
  'tn-thanjavur-papanasam__paddy__tillering': fbTnThanjavurPapanasamPaddyTillering
};
