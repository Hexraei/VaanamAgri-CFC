// Voice delivery, two paths:
//  1. Pre-generated natural Tamil clips (Edge TTS ta-IN-PallaviNeural, female)
//     shipped as static assets for the committed advisory snapshots - studio
//     quality, zero keys, works offline once cached.
//  2. On-device speechSynthesis fallback for live-generated advisories,
//     preferring the most natural Tamil voice the device offers.

let taVoice: SpeechSynthesisVoice | null = null;
let currentAudio: HTMLAudioElement | null = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const ta = voices.filter((v) => v.lang.toLowerCase().startsWith('ta'));
  taVoice =
    // cloud-backed device voices sound far more natural than legacy formant ones
    ta.find((v) => /google/i.test(v.name)) ??
    ta.find((v) => /female|pallavi|venba|saranya|kani|shruti|veena/i.test(v.name)) ??
    ta[0] ??
    voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ??
    null;
}

if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function speakTamil(text: string, onEnd?: () => void): boolean {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (taVoice) u.voice = taVoice;
  u.lang = taVoice?.lang ?? 'ta-IN';
  u.rate = 0.95;
  u.pitch = 1.05;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

// Play the committed studio clip for an advisory if one exists
// (/audio/<panchayat>__<crop>__<stage>.mp3); otherwise fall back to on-device TTS.
export function speakAdvisory(key: string, fallbackText: string, onEnd: () => void): void {
  stopSpeaking();
  const fallback = () => {
    currentAudio = null;
    if (!speakTamil(fallbackText, onEnd)) onEnd();
  };
  const audio = new Audio(`/audio/${key}.mp3`);
  currentAudio = audio;
  audio.onerror = fallback;
  audio.onended = () => {
    currentAudio = null;
    onEnd();
  };
  audio.play().catch(fallback);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
