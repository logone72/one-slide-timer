const tick = (): void => {
  self.postMessage({ type: "tick", now: Date.now() });
};

tick();
setInterval(tick, 1_000);
