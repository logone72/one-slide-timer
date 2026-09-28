import type { AppDependencies } from "./appDependencies";
import type { AppStore } from "./state/appStore";
import { selectHasCompleted } from "./state/timerState";

export function connectAudio(app: AppStore, deps: AppDependencies): () => void {
  const update = (): void =>
    app.actions.updateNotifications({
      audioReady: deps.audio.isAlertAudioReady(),
    });
  const stop = deps.audio.subscribeAlertAudio(update);
  update();
  if (selectHasCompleted(app.getState())) {
    deps.audio.startAlertAudio();
  }
  const unsubscribe = app.subscribe((state, previous) => {
    if (selectHasCompleted(state) === selectHasCompleted(previous)) {
      return;
    }
    if (selectHasCompleted(state)) {
      deps.audio.startAlertAudio();
    } else {
      deps.audio.stopAlertAudio();
    }
  });
  return () => {
    stop();
    unsubscribe();
    deps.audio.stopAlertAudio();
  };
}
