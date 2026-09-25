// diagnostic: single relative TS import, nothing else
import { neighbourPoints } from '../lib/downscale';

export default async function handler(_req: any, res: any) {
  return res.status(200).json({ ok: true, neighbours: neighbourPoints(11, 77).length });
}
