// Voice delivery, two paths:
//  1. Pre-generated natural Tamil clips (Edge TTS ta-IN-PallaviNeural, female)
//     shipped as static assets for the committed advisory snapshots - studio
//     quality, zero keys, works offline once cached.
//  2. On-device speechSynthesis fallback for live-generated advisories,
//     preferring the most natural Tamil voice the device offers.
//
// The playback path is deliberately defensive: media elements can fire
// 'playing' before failing to decode, play() promises and error events can
// both fire, and Chrome can silently drop speak() calls made synchronously
// after cancel() - so every path is guarded, deduplicated and watchdogged,
// and the UI always lands back in a non-speaking state.

let taVoice: SpeechSynthesisVoice | null = null;
let currentAudio: HTMLAudioElement | null = null;
let watchdog: number | null = null;

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
  // Chrome can silently drop an utterance spoken synchronously after cancel();
  // let the cancel settle first.
  window.speechSynthesis.cancel();
  window.setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    if (taVoice) u.voice = taVoice;
    u.lang = taVoice?.lang ?? 'ta-IN';
    u.rate = 0.95;
    u.pitch = 1.05;
    if (onEnd) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    window.speechSynthesis.speak(u);
  }, 150);
  return true;
}

// Play the committed studio clip for an advisory if one exists
// (/audio/<panchayat>__<crop>__<stage>.mp3); otherwise fall back to on-device TTS.
export function speakAdvisory(key: string, fallbackText: string, onEnd: () => void): void {
  stopSpeaking();
  let settled = false;
  let started = false;

  const finish = () => {
    if (settled) return;
    settled = true;
    if (watchdog !== null) {
      window.clearTimeout(watchdog);
      watchdog = null;
    }
    currentAudio = null;
    onEnd();
  };

  const toSpeech = () => {
    if (settled) return;
    settled = true;
    if (watchdog !== null) {
      window.clearTimeout(watchdog);
      watchdog = null;
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (!speakTamil(fallbackText, onEnd)) onEnd();
  };

  const audio = new Audio();
  currentAudio = audio;
  audio.preload = 'auto';
  audio.addEventListener('playing', () => {
    started = true;
  });
  // missing clip (or an HTML SPA-fallback body) ends here -> on-device voice
  audio.addEventListener('error', toSpeech);
  audio.addEventListener('ended', finish);
  audio.src = `/audio/${key}.mp3`;

  // watchdog: if playback neither started nor errored promptly, fall back
  watchdog = window.setTimeout(() => {
    if (!started) toSpeech();
  }, 2500);

  const playPromise = audio.play();
  if (playPromise) playPromise.catch(toSpeech);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
  if (watchdog !== null) {
    window.clearTimeout(watchdog);
    watchdog = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
