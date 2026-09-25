export const config = { runtime: 'nodejs' };

export default async function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, service: 'vaanam', time: new Date().toISOString() });
}
