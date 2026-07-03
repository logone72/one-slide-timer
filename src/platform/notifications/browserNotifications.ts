import type { NotificationAction, NotificationPort } from "./notificationPort";

let audioContext: AudioContext | null = null;
let alertInterval: number | null = null;

const actionListeners = new Set<(action: NotificationAction) => void>();

export const browserNotifications: NotificationPort = {
  async ensurePermission() {
    audioContext ??= new AudioContext();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    return true;
  },
  async scheduleTimer() {
    return Promise.resolve();
  },
  async cancelTimer() {
    return Promise.resolve();
  },
  startRepeatingAlert() {
    if (alertInterval !== null) {
      return;
    }

    playBeep();
    alertInterval = window.setInterval(playBeep, 1_500);
  },
  stopRepeatingAlert() {
    if (alertInterval === null) {
      return;
    }

    window.clearInterval(alertInterval);
    alertInterval = null;
  },
  onNotificationAction(listener) {
    actionListeners.add(listener);
    return () => actionListeners.delete(listener);
  },
};

function playBeep(): void {
  if (audioContext === null) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.18);
}
