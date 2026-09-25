// diagnostic: single relative JSON import, nothing else
import pj from '../data/panchayats.json';

export default async function handler(_req: any, res: any) {
  return res.status(200).json({ ok: true, count: (pj as any).panchayats?.length ?? -1 });
}
