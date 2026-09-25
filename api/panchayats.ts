import { panchayatsDoc } from './_data.js';

export default async function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=86400');
  return res.status(200).json(panchayatsDoc);
}
