import type { PluginListenerHandle } from "@capacitor/core";

// Capacitor 등록이 해제 이후 완료되는 경우에도 네이티브 핸들을 남기지 않는다.
export function nativeSubscription<T>(
  register: (listener: (event: T) => void) => Promise<PluginListenerHandle>,
  listener: (event: T) => void,
  onFailure: () => void
): () => void {
  let disposed = false;
  let handle: PluginListenerHandle | undefined;
  const fail = (): void => {
    if (!disposed) {
      onFailure();
    }
  };
  void register((event) => {
    if (!disposed) {
      listener(event);
    }
  })
    .then((registered) => {
      if (disposed) {
        void registered.remove().catch(fail);
      } else {
        handle = registered;
      }
    })
    .catch(fail);
  return () => {
    disposed = true;
    void handle?.remove().catch(fail);
    handle = undefined;
  };
}
