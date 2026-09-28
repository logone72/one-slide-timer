import type { AppDependencies } from "./appDependencies";
import type { AppState, AppStore } from "./state/appStore";
import { selectAudioEnabled } from "./state/notificationState";
import { selectHasCompleted } from "./state/timerState";

export function connectAudio(app: AppStore, deps: AppDependencies): () => void {
  const update = (): void =>
    app.actions.updateNotifications({
      audioReady: deps.audio.isAlertAudioReady(),
    });
  const stop = deps.audio.subscribeAlertAudio(update);
  update();
  if (shouldPlay(app.getState())) {
    deps.audio.startAlertAudio();
  }
  const unsubscribe = app.subscribe((state, previous) => {
    if (shouldPlay(state) === shouldPlay(previous)) {
      return;
    }
    if (shouldPlay(state)) {
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

// 저장소를 읽지 못했다면 저장된 X를 무시하고 기본값으로 소리를 내지 않는다.
function shouldPlay(state: AppState): boolean {
  return selectAudioEnabled(state) && selectHasCompleted(state);
}
