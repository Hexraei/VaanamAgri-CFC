import { useEffect, useMemo, useState } from 'react';
import type { Panchayat } from '../api/_types';
import { getPanchayats } from './api';
import { loadSelection, saveSelection } from './store';
import AdvisoryView from './views/AdvisoryView';
import ForecastView from './views/ForecastView';
import DoctorView from './views/DoctorView';
import AboutView from './views/AboutView';
import Icon from './components/Icon';

type Tab = 'advisory' | 'forecast' | 'doctor' | 'about';

const TABS: Array<{ id: Tab; en: string; ta: string; icon: 'sprout' | 'cloud-sun' | 'leaf' | 'info' }> = [
  { id: 'advisory', en: 'Advisory', ta: 'அறிவுரை', icon: 'sprout' },
  { id: 'forecast', en: 'Forecast', ta: 'வானிலை', icon: 'cloud-sun' },
  { id: 'doctor', en: 'Crop Doctor', ta: 'பயிர் மருத்துவர்', icon: 'leaf' },
  { id: 'about', en: 'About', ta: 'பற்றி', icon: 'info' }
];

export default function App() {
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'forecast' || t === 'doctor' || t === 'about' ? t : 'advisory';
  });
  const [panchayats, setPanchayats] = useState<Panchayat[]>([]);
  const [sel, setSel] = useState(loadSelection());
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    getPanchayats().then(setPanchayats).catch(() => setPanchayats([]));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => saveSelection(sel), [sel]);

  const panchayat = useMemo(
    () => panchayats.find((p) => p.id === sel.panchayatId) ?? null,
    [panchayats, sel.panchayatId]
  );

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <img src="/icon.svg" alt="" className="logo-mark" />
          <span className="logo">Vaanam</span>
          <span className="logo-ta">வானம்</span>
        </div>
        {!online && <span className="offline-pill">offline - saved data</span>}
      </header>

      {!panchayat ? (
        <PanchayatPicker panchayats={panchayats} onPick={(id) => setSel((s) => ({ ...s, panchayatId: id }))} />
      ) : (
        <>
          <button className="change-place" onClick={() => setSel((s) => ({ ...s, panchayatId: null }))}>
            <span className="place-label"><Icon name="pin" size={16} /> {panchayat.name_ta} ({panchayat.name}), {panchayat.district}</span>
            <span className="change-link">change</span>
          </button>
          {tab === 'advisory' && <AdvisoryView panchayat={panchayat} sel={sel} setSel={setSel} />}
          {tab === 'forecast' && <ForecastView panchayat={panchayat} />}
          {tab === 'doctor' && <DoctorView />}
          {tab === 'about' && <AboutView />}
        </>
      )}

      {panchayat && (
        <nav className="tabbar">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
              <span className="tab-icon"><Icon name={t.icon} size={22} /></span>
              <span className="tab-ta">{t.ta}</span>
              <span className="tab-en">{t.en}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function PanchayatPicker({
  panchayats,
  onPick
}: {
  panchayats: Panchayat[];
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = panchayats.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.name_ta.includes(q) ||
      p.district.toLowerCase().includes(q.toLowerCase())
  );
  const byState = filtered.reduce<Record<string, Panchayat[]>>((acc, p) => {
    (acc[p.state] ??= []).push(p);
    return acc;
  }, {});
  return (
    <main className="picker">
      <h2>Choose your panchayat</h2>
      <p className="muted">உங்கள் ஊராட்சி ஐத் தேர்ந்தெடுக்கவும்</p>
      <input
        className="search"
        placeholder="Search... / தேடுக..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {Object.entries(byState).map(([state, list]) => (
        <section key={state}>
          <h3 className="state-head">{state}</h3>
          {list.map((p) => (
            <button key={p.id} className="place-row" onClick={() => onPick(p.id)}>
              <div>
                <span className="place-ta">{p.name_ta}</span>
                <span className="place-en">{p.name}, {p.district}</span>
              </div>
            </button>
          ))}
        </section>
      ))}
      {panchayats.length === 0 && <p className="muted">Loading panchayats... (needs connection once)</p>}
    </main>
  );
}
