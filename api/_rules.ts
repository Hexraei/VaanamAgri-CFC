// Evaluates the agronomy rule pack against downscaled daily forecasts.
// Pure functions - no I/O - so they run identically in tests, the advisory
// API, and the fallback generator.

import type { DayForecast, AdvisoryAction } from './_types.js';

interface RuleWhen {
  precip_mm_next24h_gte?: number;
  precip_mm_next48h_gte?: number;
  precip_mm_next72h_gte?: number;
  wind_kmh_gte?: number;
  humidity_pct_gte?: number;
  dry_days_gte?: number;
  temp_c_between?: [number, number];
  stage_in?: string[];
}

interface Rule {
  id: string;
  when: RuleWhen;
  action_en: string;
  action_ta: string;
  severity: 'info' | 'medium' | 'high';
}

export interface Crop {
  id: string;
  name_en: string;
  name_ta: string;
  stages: Array<{ id: string; name_en: string; name_ta: string }>;
  rules: Rule[];
}

function dryStreak(days: DayForecast[], upto: number): number {
  let streak = 0;
  for (let i = 0; i <= upto && i < days.length; i++) {
    if (days[i].precipMm < 1) streak++;
    else break;
  }
  return streak;
}

function ruleFires(rule: Rule, days: DayForecast[], stage: string): boolean {
  const w = rule.when;
  if (w.stage_in && !w.stage_in.includes(stage)) return false;
  const d0 = days[0];
  const next24 = d0.precipMm;
  const next48 = (days[0]?.precipMm ?? 0) + (days[1]?.precipMm ?? 0);
  const next72 = next48 + (days[2]?.precipMm ?? 0);
  if (w.precip_mm_next24h_gte !== undefined && next24 < w.precip_mm_next24h_gte) return false;
  if (w.precip_mm_next48h_gte !== undefined && next48 < w.precip_mm_next48h_gte) return false;
  if (w.precip_mm_next72h_gte !== undefined && next72 < w.precip_mm_next72h_gte) return false;
  if (w.wind_kmh_gte !== undefined && d0.windMaxKmh < w.wind_kmh_gte) return false;
  if (w.humidity_pct_gte !== undefined && d0.humidityAvg < w.humidity_pct_gte) return false;
  if (w.temp_c_between !== undefined) {
    const tAvg = (d0.tmin + d0.tmax) / 2;
    if (tAvg < w.temp_c_between[0] || tAvg > w.temp_c_between[1]) return false;
  }
  if (w.dry_days_gte !== undefined && dryStreak(days, w.dry_days_gte) < w.dry_days_gte) return false;
  return true;
}

export function evaluateRules(crop: Crop, stage: string, days: DayForecast[]): AdvisoryAction[] {
  const fired = crop.rules
    .filter((r) => ruleFires(r, days, stage))
    .map((r) => ({ ruleId: r.id, severity: r.severity, en: r.action_en, ta: r.action_ta }));
  const order = { high: 0, medium: 1, info: 2 } as const;
  return fired.sort((a, b) => order[a.severity] - order[b.severity]);
}
