let context: AudioContext | null = null;
let interval: number | undefined;
let playing: OscillatorNode | undefined;
const changes = new EventTarget();

export const isAlertAudioReady = (): boolean => context?.state === "running";
export function subscribeAlertAudio(listener: () => void): () => void {
  changes.addEventListener("change", listener);
  return () => changes.removeEventListener("change", listener);
}

const notify = (): boolean => changes.dispatchEvent(new Event("change"));

export async function prepareAlertAudio(): Promise<boolean> {
  try {
    if (context === null || context.state === "closed") {
      context = new AudioContext();
      context.onstatechange = notify;
    }
    if (context.state !== "running") {
      await context.resume();
    }
    notify();
    return isAlertAudioReady();
  } catch {
    return false;
  }
}

export function startAlertAudio(): void {
  if (interval !== undefined) {
    return;
  }
  playBeep();
  interval = window.setInterval(playBeep, 1_500);
}

export function stopAlertAudio(): void {
  window.clearInterval(interval);
  interval = undefined;
  playing?.stop();
  playing = undefined;
}

function playBeep(): void {
  if (context?.state !== "running") {
    return;
  }
  const oscillator = context.createOscillator();
  playing = oscillator;
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.onended = () => {
    if (playing === oscillator) {
      playing = undefined;
    }
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
}

export async function testAlertAudio(): Promise<boolean> {
  const ready = await prepareAlertAudio();
  if (ready) {
    playBeep();
  }
  return ready;
}
