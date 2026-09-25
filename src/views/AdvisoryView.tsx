import { useEffect, useState } from 'react';
import type { Advisory, Panchayat } from '../../api/_types';
import { getAdvisory } from '../api';
import { speakTamil, stopSpeaking } from '../tts';
import type { Selection } from '../store';

const CROPS = [
  { id: 'paddy', en: 'Paddy', ta: 'நெல்' },
  { id: 'banana', en: 'Banana', ta: 'வாழை' },
  { id: 'groundnut', en: 'Groundnut', ta: 'நிலக்கடலை' },
  { id: 'cotton', en: 'Cotton', ta: 'பருத்தி' }
];

const STAGES: Record<string, Array<{ id: string; en: string; ta: string }>> = {
  paddy: [
    { id: 'nursery', en: 'Nursery', ta: 'நாற்றங்கால்' },
    { id: 'transplanting', en: 'Transplanting', ta: 'நடவு' },
    { id: 'tillering', en: 'Tillering', ta: 'கத்தரிப்பு' },
    { id: 'flowering', en: 'Flowering', ta: 'பூக்கும்' },
    { id: 'harvest', en: 'Harvest', ta: 'அறுவடை' }
  ],
  banana: [
    { id: 'planting', en: 'Planting', ta: 'நடவு' },
    { id: 'vegetative', en: 'Vegetative', ta: 'வளர்ச்சி' },
    { id: 'bunching', en: 'Bunch emergence', ta: 'குலை தோன்றல்' },
    { id: 'harvest', en: 'Harvest', ta: 'அறுவடை' }
  ],
  groundnut: [
    { id: 'sowing', en: 'Sowing', ta: 'விதைப்பு' },
    { id: 'flowering', en: 'Flowering', ta: 'பூக்கும்' },
    { id: 'pegging', en: 'Pegging', ta: 'கடலை உருவாக்கம்' },
    { id: 'harvest', en: 'Harvest', ta: 'அறுவடை' }
  ],
  cotton: [
    { id: 'sowing', en: 'Sowing', ta: 'விதைப்பு' },
    { id: 'vegetative', en: 'Vegetative', ta: 'வளர்ச்சி' },
    { id: 'boll', en: 'Boll formation', ta: 'காய்' },
    { id: 'picking', en: 'Picking', ta: 'பறித்தல்' }
  ]
};

export default function AdvisoryView({
  panchayat,
  sel,
  setSel
}: {
  panchayat: Panchayat;
  sel: Selection;
  setSel: (fn: (s: Selection) => Selection) => void;
}) {
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    getAdvisory(panchayat.id, sel.crop, sel.stage)
      .then((a) => alive && setAdvisory(a))
      .catch((e) => alive && setErr(String(e.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [panchayat.id, sel.crop, sel.stage]);

  const stages = STAGES[sel.crop] ?? [];

  return (
    <main className="view">
      <div className="chips">
        {CROPS.map((c) => (
          <button
            key={c.id}
            className={sel.crop === c.id ? 'chip active' : 'chip'}
            onClick={() => setSel((s) => ({ ...s, crop: c.id, stage: STAGES[c.id][0].id }))}
          >
            {c.ta}
          </button>
        ))}
      </div>
      <div className="chips small">
        {stages.map((s) => (
          <button
            key={s.id}
            className={sel.stage === s.id ? 'chip active' : 'chip'}
            onClick={() => setSel((prev) => ({ ...prev, stage: s.id }))}
          >
            {s.ta}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Preparing today's advisory...</p>}
      {err && <p className="error">Could not load advisory: {err}</p>}

      {advisory && !loading && (
        <>
          <section className="card advisory-card">
            <p className="advisory-text">{showEn ? advisory.summaryEn : advisory.summaryTa}</p>
            <div className="advisory-actions-row">
              <button
                className="voice-btn"
                onClick={() => {
                  if (speaking) {
                    stopSpeaking();
                    setSpeaking(false);
                  } else if (speakTamil(advisory.summaryTa + '. ' + advisory.actions.map((a) => a.ta).join('. '))) {
                    setSpeaking(true);
                  }
                }}
              >
                {speaking ? '⏹ Stop' : '🔊 கேளுங்கள் (Listen)'}
              </button>
              <button className="lang-toggle" onClick={() => setShowEn((v) => !v)}>
                {showEn ? 'தமிழில்' : 'In English'}
              </button>
            </div>
          </section>

          {advisory.actions.length > 0 && (
            <section className="card">
              <h3>Actions / செய்ய வேண்டியவை</h3>
              {advisory.actions.map((a, i) => (
                <div key={i} className={`action-row sev-${a.severity}`}>
                  <span className="sev-dot" />
                  <p>{showEn ? a.en : a.ta}</p>
                </div>
              ))}
            </section>
          )}

          <p className="muted tiny">
            Generated {new Date(advisory.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} ·
            engine: {advisory.generatedBy === 'gemini' ? 'Gemini AI' : 'rule engine'}
          </p>
        </>
      )}
    </main>
  );
}
