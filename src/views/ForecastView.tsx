import { useEffect, useState } from 'react';
import type { Panchayat, PanchayatForecast } from '../../lib/types';
import { getForecast } from '../api';

const DAY_TA = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];

function confBadge(c: string) {
  if (c === 'high') return { label: 'high confidence', cls: 'conf-high' };
  if (c === 'medium') return { label: 'medium confidence', cls: 'conf-med' };
  return { label: 'low confidence', cls: 'conf-low' };
}

export default function ForecastView({ panchayat }: { panchayat: Panchayat }) {
  const [fc, setFc] = useState<PanchayatForecast | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setFc(null);
    setErr(null);
    getForecast(panchayat.id).then(setFc).catch((e) => setErr(String(e.message ?? e)));
  }, [panchayat.id]);

  if (err) return <main className="view"><p className="error">Forecast unavailable: {err}</p></main>;
  if (!fc) return <main className="view"><p className="muted">Downscaling forecast for {panchayat.name}...</p></main>;

  return (
    <main className="view">
      <p className="muted">
        Panchayat-level forecast · elevation {fc.elevationM}m · downscaled from model grid
      </p>
      {fc.days.map((d) => {
        const date = new Date(d.date + 'T00:00:00+05:30');
        const badge = confBadge(d.confidence);
        return (
          <section className="card day-card" key={d.date}>
            <div className="day-head">
              <strong>{DAY_TA[date.getDay()]} {d.date.slice(8)} / {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
              <span className={`conf ${badge.cls}`}>{badge.label}</span>
            </div>
            <div className="day-grid">
              <div><span className="num">{d.tmin}–{d.tmax}°</span><span className="lbl">temp C</span></div>
              <div><span className="num">{d.precipMm}</span><span className="lbl">rain mm</span></div>
              <div><span className="num">{d.precipProbMax}%</span><span className="lbl">rain chance</span></div>
              <div><span className="num">{d.humidityAvg}%</span><span className="lbl">humidity</span></div>
              <div><span className="num">{d.windMaxKmh}</span><span className="lbl">wind km/h</span></div>
            </div>
          </section>
        );
      })}
      <p className="muted tiny">Data: Open-Meteo (IMD/ECMWF/GFS model blend) · updated {new Date(fc.generatedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </main>
  );
}
