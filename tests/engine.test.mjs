// Engine smoke tests run against the BUILT JS (tsx not required):
//   npm run build:lib && node --test tests/
// For the hackathon we run them with node --experimental-strip-types instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downscale, neighbourPoints } from '../lib/downscale.ts';
import { evaluateRules } from '../lib/rules.ts';
import { readFileSync } from 'node:fs';

function mockCell(lat, lng, elev, tBase, pBase) {
  const n = 5 * 24;
  return {
    lat, lng, elevation: elev,
    hourly: {
      time: Array.from({ length: n }, (_, i) => `2026-09-${String(26 + Math.floor(i / 24))}T${String(i % 24).padStart(2, "0")}:00`),
      temperature_2m: Array.from({ length: n }, () => tBase),
      precipitation_probability: Array.from({ length: n }, () => 20),
      precipitation: Array.from({ length: n }, () => pBase),
      relative_humidity_2m: Array.from({ length: n }, () => 70),
      wind_speed_10m: Array.from({ length: n }, () => 8)
    }
  };
}

test('neighbourPoints returns 5 points centred on target', () => {
  const pts = neighbourPoints(10.9, 79.2);
  assert.equal(pts.length, 5);
  assert.deepEqual(pts[0], { lat: 10.9, lng: 79.2 });
});

test('downscale applies lapse-rate correction for elevation difference', () => {
  // all grid cells at 100m, true panchayat elevation 1100m -> -6.5C correction
  const cells = [
    mockCell(10.9, 79.2, 100, 30, 0),
    mockCell(11.0, 79.2, 100, 30, 0),
    mockCell(10.8, 79.2, 100, 30, 0),
    mockCell(10.9, 79.3, 100, 30, 0),
    mockCell(10.9, 79.1, 100, 30, 0)
  ];
  const days = downscale(cells, { lat: 10.9, lng: 79.2 }, 1100);
  assert.equal(days.length, 5);
  assert.ok(Math.abs(days[0].tmax - 23.5) < 0.05, `expected 23.5, got ${days[0].tmax}`);
});

test('uniform cells yield high confidence', () => {
  const cells = [10.9, 11.0, 10.8, 10.9, 10.9].map((la, i) =>
    mockCell(la, [79.2, 79.2, 79.2, 79.3, 79.1][i], 100, 30, 0.2)
  );
  const days = downscale(cells, { lat: 10.9, lng: 79.2 }, 100);
  assert.equal(days[0].confidence, 'high');
});

const crops = JSON.parse(readFileSync(new URL('../data/crops.json', import.meta.url))).crops;

test('spray-rain-washoff fires when next-24h rain >= 5mm', () => {
  const paddy = crops.find((c) => c.id === 'paddy');
  const wetDays = [
    { date: '2026-09-26', tmin: 24, tmax: 32, precipMm: 8, precipProbMax: 90, humidityAvg: 88, windMaxKmh: 10, confidence: 'high' },
    { date: '2026-09-27', tmin: 24, tmax: 32, precipMm: 2, precipProbMax: 60, humidityAvg: 80, windMaxKmh: 8, confidence: 'high' }
  ];
  const actions = evaluateRules(paddy, 'tillering', wetDays);
  assert.ok(actions.some((a) => a.ruleId === 'spray-rain-washoff'));
  assert.equal(actions[0].severity, 'high');
});

test('no rules fire on benign forecast', () => {
  const paddy = crops.find((c) => c.id === 'paddy');
  const calmDays = [
    { date: '2026-09-26', tmin: 26, tmax: 34, precipMm: 0, precipProbMax: 5, humidityAvg: 60, windMaxKmh: 8, confidence: 'high' }
  ];
  const actions = evaluateRules(paddy, 'nursery', calmDays);
  assert.equal(actions.length, 0);
});
