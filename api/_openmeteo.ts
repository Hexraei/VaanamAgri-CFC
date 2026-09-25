// Open-Meteo client. Free, keyless, non-commercial use.
// https://open-meteo.com/en/docs - the API already applies 90m-DEM elevation
// correction per coordinate; our downscale layer blends the local cell with
// neighbours and adds a lapse-rate pass on top.

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation';

export interface HourlyPoint {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
}

export interface CellForecast {
  lat: number;
  lng: number;
  elevation: number;
  hourly: HourlyPoint;
}

const HOURLY_VARS =
  'temperature_2m,precipitation_probability,precipitation,relative_humidity_2m,wind_speed_10m';

export async function fetchCells(
  points: Array<{ lat: number; lng: number }>
): Promise<CellForecast[]> {
  const lats = points.map((p) => p.lat.toFixed(4)).join(',');
  const lngs = points.map((p) => p.lng.toFixed(4)).join(',');
  const url =
    `${FORECAST_URL}?latitude=${lats}&longitude=${lngs}` +
    `&hourly=${HOURLY_VARS}&forecast_days=5&timezone=Asia%2FKolkata&cell_selection=land`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo forecast ${res.status}`);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((cell: any, i: number) => ({
    lat: cell.latitude,
    lng: cell.longitude,
    elevation: cell.elevation,
    hourly: cell.hourly as HourlyPoint
  }));
}

export async function fetchElevation(lat: number, lng: number): Promise<number> {
  const res = await fetch(`${ELEVATION_URL}?latitude=${lat}&longitude=${lng}`);
  if (!res.ok) throw new Error(`open-meteo elevation ${res.status}`);
  const data = await res.json();
  return data.elevation?.[0] ?? 0;
}
