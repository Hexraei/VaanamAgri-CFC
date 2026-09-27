// Always speak the text on screen, not an older panchayat/crop/stage clip.
// The server uses a natural Tamil neural voice. A Tamil device voice is the
// offline fallback; never substitute a Hindi voice for Tamil words.
let currentAudio: HTMLAudioElement | null = null;
let currentRequest: AbortController | null = null;
let utteranceTimer: number | null = null;
let currentUrl: string | null = null;
let generation = 0;

function deviceVoice(lang: 'ta' | 'en'): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const available = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  return available.find((v) => /google|pallavi|venba|saranya|kani|shruti|veena|neerja/i.test(v.name)) ?? available[0];
}

function speakOnDevice(text: string, lang: 'ta' | 'en', done: () => void, token: number): void {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    done();
    return;
  }
  const voice = deviceVoice(lang);
  // Request the same language as the text; never substitute Hindi for Tamil.
  utteranceTimer = window.setTimeout(() => {
    utteranceTimer = null;
    if (token !== generation) return;
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    u.rate = 0.95;
    u.pitch = 1.05;
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  }, 150);
}

export async function speakAdvisory(text: string, lang: 'ta' | 'en', onEnd: () => void): Promise<void> {
  stopSpeaking();
  const token = generation;
  const controller = new AbortController();
  currentRequest = controller;
  let objectUrl: string | null = null;
  let finished = false;
  const finish = () => {
    if (finished || token !== generation) return;
    finished = true;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    currentUrl = null;
    currentAudio = null;
    currentRequest = null;
    onEnd();
  };
  try {
    const response = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error('voice unavailable');
    const blob = await response.blob();
    if (!blob.size || token !== generation) return;
    objectUrl = URL.createObjectURL(blob);
    currentUrl = objectUrl;
    const audio = new Audio(objectUrl);
    currentAudio = audio;
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
      currentAudio = null;
      if (token === generation) speakOnDevice(text, lang, finish, token);
    }, { once: true });
    await audio.play();
  } catch {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    currentAudio = null;
    if (token === generation) speakOnDevice(text, lang, finish, token);
  }
}

export function stopSpeaking(): void {
  generation++;
  currentRequest?.abort();
  currentRequest = null;
  if (utteranceTimer !== null) window.clearTimeout(utteranceTimer);
  utteranceTimer = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
  window.speechSynthesis?.cancel();
}
