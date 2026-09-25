// diagnostic: fully self-contained, zero imports
export default async function handler(_req: any, res: any) {
  const pts: Array<[number, number]> = [];
  for (const d of [-0.1, 0, 0.1]) pts.push([11 + d, 77 + d]);
  return res.status(200).json({ ok: true, pts: pts.length });
}
