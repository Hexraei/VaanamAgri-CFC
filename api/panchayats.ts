import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export default async function handler(_req: any, res: any) {
  const data = JSON.parse(readFileSync(join(process.cwd(), 'data', 'panchayats.json'), 'utf8'));
  res.setHeader('Cache-Control', 's-maxage=86400');
  return res.status(200).json(data);
}
