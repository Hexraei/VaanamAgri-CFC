// Downscaling engine: takes the model cell at the panchayat plus the 4
// surrounding cells (~0.1deg offsets) and produces a panchayat-level daily
// forecast with a confidence grade.
//
// Method:
//  1. Inverse-distance-weighted blend of the 5 cells for every hourly value.
//  2. Lapse-rate temperature correction: -6.5 C per km of elevation
//     difference between the panchayat's true elevation (90m DEM) and the
//     blended grid elevation.
//  3. Confidence from inter-cell spread: low spread = the coarse model grid
//     agrees locally = high confidence.

import type { CellForecast } from './openmeteo';
import type { DayForecast } from './types';

const LAPSE_C_PER_KM = -6.5;
const CELL_OFFSET = 0.1; // degrees, ~11 km

export function neighbourPoints(lat: number, lng: number) {
  return [
    { lat, lng }, // centre cell first
    { lat: lat + CELL_OFFSET, lng },
    { lat: lat - CELL_OFFSET, lng },
    { lat, lng: lng + CELL_OFFSET },
    { lat, lng: lng - CELL_OFFSET }
  ];
}

function idw(values: Array<{ v: number; d: number }>): number {
  let num = 0;
  let den = 0;
  for (const { v, d } of values) {
    const w = 1 / Math.max(d, 0.0001) ** 2;
    num += v * w;
    den += w;
  }
  return num / den;
}

function spread(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

export function downscale(
  cells: CellForecast[],
  target: { lat: number; lng: number },
  trueElevationM: number
): DayForecast[] {
  const centre = cells[0];
  const n = centre.hourly.time.length;

  // distance of each cell centre from the panchayat, in degrees
  const dists = cells.map((c) => Math.hypot(c.lat - target.lat, c.lng - target.lng));
  const blendedElevation = idw(cells.map((c, i) => ({ v: c.elevation, d: dists[i] })));
  const deltaT = ((trueElevationM - blendedElevation) / 1000) * LAPSE_C_PER_KM;

  const hourlyT: number[] = [];
  const hourlyP: number[] = [];
  const hourlyProb: number[] = [];
  const hourlyRH: number[] = [];
  const hourlyW: number[] = [];

  for (let h = 0; h < n; h++) {
    hourlyT.push(idw(cells.map((c, i) => ({ v: c.hourly.temperature_2m[h], d: dists[i] }))) + deltaT);
    hourlyP.push(idw(cells.map((c, i) => ({ v: c.hourly.precipitation[h], d: dists[i] }))));
    hourlyProb.push(idw(cells.map((c, i) => ({ v: c.hourly.precipitation_probability[h], d: dists[i] }))));
    hourlyRH.push(idw(cells.map((c, i) => ({ v: c.hourly.relative_humidity_2m[h], d: dists[i] }))));
    hourlyW.push(idw(cells.map((c, i) => ({ v: c.hourly.wind_speed_10m[h], d: dists[i] }))));
  }

  // confidence per day from temperature + precip spread between cells
  const byDate = new Map<string, number[]>();
  centre.hourly.time.forEach((t, h) => {
    const date = t.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(h);
  });

  const days: DayForecast[] = [];
  for (const [date, hours] of byDate) {
    const temps = hours.map((h) => hourlyT[h]);
    const precips = hours.map((h) => hourlyP[h]);
    const tSpread = spread(hours.map((h) => cells[0].hourly.temperature_2m[h]).map((v, i) => v - cells[1].hourly.temperature_2m[hours[i]]));
    const pSpread = spread(hours.map((h) => cells.map((c) => c.hourly.precipitation[h])).flat());
    const confidence: DayForecast['confidence'] =
      pSpread < 0.5 && tSpread < 1.5 ? 'high' : pSpread < 1.5 ? 'medium' : 'low';
    days.push({
      date,
      tmin: Math.round(Math.min(...temps) * 10) / 10,
      tmax: Math.round(Math.max(...temps) * 10) / 10,
      precipMm: Math.round(precips.reduce((a, b) => a + b, 0) * 10) / 10,
      precipProbMax: Math.round(Math.max(...hours.map((h) => hourlyProb[h]))),
      humidityAvg: Math.round(hours.reduce((a, h) => a + hourlyRH[h], 0) / hours.length),
      windMaxKmh: Math.round(Math.max(...hours.map((h) => hourlyW[h]))),
      confidence
    });
  }
  return days.slice(0, 5);
}
