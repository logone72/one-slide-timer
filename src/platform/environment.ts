type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
};

export function isCapacitorNative(): boolean {
  const browserWindow = window as Window & { Capacitor?: CapacitorGlobal };
  return Boolean(browserWindow.Capacitor?.isNativePlatform?.());
}
