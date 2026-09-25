import { fetchCells, fetchElevation } from '../lib/openmeteo';
import { downscale, neighbourPoints } from '../lib/downscale';
import { panchayats } from './_data';
import type { PanchayatForecast } from '../lib/types';

export default async function handler(req: any, res: any) {
  const id = String(req.query?.panchayat ?? '');
  const p = panchayats.find((x) => x.id === id);
  if (!p) return res.status(404).json({ error: 'unknown panchayat', id });

  try {
    const [cells, elevation] = await Promise.all([
      fetchCells(neighbourPoints(p.lat, p.lng)),
      fetchElevation(p.lat, p.lng)
    ]);
    const days = downscale(cells, { lat: p.lat, lng: p.lng }, elevation);
    const body: PanchayatForecast = {
      panchayat: p,
      elevationM: Math.round(elevation),
      generatedAt: new Date().toISOString(),
      days
    };
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(body);
  } catch (e: any) {
    return res.status(502).json({ error: 'upstream forecast failed', detail: String(e?.message ?? e) });
  }
}
