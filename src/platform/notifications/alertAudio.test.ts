import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("restores audio after user activation and keeps a single repeating alarm", async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal("window", globalThis);
  const oscillator = {
    frequency: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: () => undefined,
  };
  const gain = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "suspended";
      currentTime = 0;
      destination = {};
      resume() {
        this.state = "running";
        return Promise.resolve();
      }
      createOscillator() {
        return oscillator;
      }
      createGain() {
        return gain;
      }
    }
  );
  const audio = await import("./alertAudio");
  audio.startAlertAudio();
  vi.advanceTimersByTime(1500);
  expect(oscillator.start).not.toHaveBeenCalled();
  expect(await audio.prepareAlertAudio()).toBe(true);
  audio.startAlertAudio();
  vi.advanceTimersByTime(3000);
  expect(oscillator.start).toHaveBeenCalledTimes(2);
  oscillator.onended();
  expect(oscillator.disconnect).toHaveBeenCalledOnce();
  expect(gain.disconnect).toHaveBeenCalledOnce();
  audio.stopAlertAudio();
  vi.advanceTimersByTime(3000);
  expect(oscillator.start).toHaveBeenCalledTimes(2);
});

it("keeps audio failures recoverable", async () => {
  vi.resetModules();
  const create = vi.fn(function AudioContext() {
    throw new Error("blocked");
  });
  vi.stubGlobal("AudioContext", create);
  const audio = await import("./alertAudio");
  expect(await audio.prepareAlertAudio()).toBe(false);
  expect(await audio.prepareAlertAudio()).toBe(false);
  expect(create).toHaveBeenCalledTimes(2);
});
