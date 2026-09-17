import { type SetStateAction, useEffect, useState } from "react";

import type { StorageRead } from "@/domain/timer/timerStorage";

export function useStoredState<T>(
  load: () => StorageRead<T>,
  save: (value: T) => boolean,
  fallback: T,
  merge: (stored: T, current: T) => T
) {
  const [initial] = useState(load);
  const [value, setValue] = useState(initial.ok ? initial.value : fallback);
  const [loaded, setLoaded] = useState(initial.ok);
  const [dirty, setDirty] = useState(false);
  const [failed, setFailed] = useState(!initial.ok);
  useEffect(() => {
    if (loaded) {
      // 외부 저장소 쓰기 결과를 화면에 반영한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(!save(value));
    }
  }, [loaded, save, value]);
  const update = (next: SetStateAction<T>): void => {
    setDirty(true);
    setValue(next);
  };
  const retry = (): void => {
    if (loaded) {
      setFailed(!save(value));
      return;
    }
    const result = load();
    if (!result.ok) {
      return;
    }
    const restored = dirty ? merge(result.value, value) : result.value;
    setValue(restored);
    setLoaded(true);
    setFailed(!save(restored));
  };
  return { value, update, failed, retry };
}
