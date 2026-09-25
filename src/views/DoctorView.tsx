import { useRef, useState } from 'react';
import { diagnose, type Diagnosis } from '../api';
import Icon from '../components/Icon';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function DoctorView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEn, setShowEn] = useState(false);

  async function onFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setErr(null);
    setBusy(true);
    try {
      const b64 = await fileToBase64(file);
      setResult(await diagnose(b64, file.type || 'image/jpeg'));
    } catch (e: any) {
      setErr(
        e?.message === 'diagnosis_unavailable'
          ? 'Crop Doctor needs the deployment API key - coming online before submission.'
          : String(e?.message ?? e)
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="view">
      <h2>Crop Doctor / பயிர் மருத்துவர்</h2>
      <p className="muted">Photograph a sick leaf. Gemini identifies the problem and suggests treatment in Tamil.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <button className="upload-zone" onClick={() => inputRef.current?.click()}>
        <span className="cam"><Icon name="camera" size={36} /></span>
        Take a leaf photo
        <small>பாதிக்கப்பட்ட இலையை புகைப்படம் எடுக்கவும்</small>
      </button>
      {preview && <img className="leaf-preview" src={preview} alt="leaf" />}
      {busy && <p className="muted">Gemini is examining the leaf...</p>}
      {err && <p className="error">{err}</p>}
      {result && (
        <section className="card">
          <div className="day-head">
            <strong>{result.finding}</strong>
            <span className={`conf conf-${result.confidence}`}>{result.confidence}</span>
          </div>
          <p className="muted tiny">crop: {result.crop}</p>
          <p className="advisory-text">{showEn ? result.advice_en : result.advice_ta}</p>
          <button className="lang-toggle" onClick={() => setShowEn((v) => !v)}>
            {showEn ? 'தமிழில்' : 'In English'}
          </button>
          {result.see_officer && (
            <p className="error">This one needs your local agriculture officer / உங்கள் வேளாண் அலுவலரை அணுகவும்.</p>
          )}
        </section>
      )}
    </main>
  );
}
