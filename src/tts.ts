// Voice delivery: on-device Tamil TTS. Free, works offline, no account -
// the right choice for a farmer on a cheap Android with patchy signal.

let taVoice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  taVoice =
    voices.find((v) => v.lang.toLowerCase().startsWith('ta')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ??
    null;
}

if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function speakTamil(text: string): boolean {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (taVoice) u.voice = taVoice;
  u.lang = taVoice?.lang ?? 'ta-IN';
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
