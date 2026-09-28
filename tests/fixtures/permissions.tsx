import "../../src/styles/base.css";

import { Profiler, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "../../src/app/App";
import { browserDependencies } from "../../src/app/appDependencies";
import { AppStateProvider } from "../../src/app/AppStateProvider";
import { useAppStore } from "../../src/app/useAppState";
import type { NotificationPermission } from "../../src/platform/notifications/notificationPort";

// 테스트 페이지에서만 어댑터를 교체한다. 배포 진입점과 store에는 테스트 분기가 없다.
const controls = {
  permission: "prompt" as NotificationPermission,
  requested: 0,
  checked: 0,
  tested: 0,
  deferCheck: new URLSearchParams(location.search).has("defer"),
  failCheck: false,
  resolveCheck: (): void => undefined,
  resolveRequest: (permission: NotificationPermission) => {
    controls.permission = permission;
  },
  rejectRequest: (): void => undefined,
  resume: (): void => undefined,
  bookings: new Map<string, number>(),
};
Object.assign(window, { notificationTest: controls });
const deps = browserDependencies();
deps.notifications = {
  checkPermission: () => {
    controls.checked++;
    if (controls.failCheck) {
      return Promise.reject(new Error("check failed"));
    }
    if (!controls.deferCheck) {
      return Promise.resolve(controls.permission);
    }
    return new Promise((resolve) => {
      controls.resolveCheck = () => {
        controls.deferCheck = false;
        resolve(controls.permission);
      };
    });
  },
  requestPermission: () => {
    controls.requested++;
    return new Promise((resolve, reject) => {
      controls.rejectRequest = () => reject(new Error("request failed"));
      controls.resolveRequest = (permission) => {
        controls.permission = permission;
        resolve(permission);
      };
    });
  },
  scheduleTimer: (timer) => {
    controls.bookings.set(timer.id, timer.endAt);
    return Promise.resolve();
  },
  cancelTimer: (id) => {
    controls.bookings.delete(id);
    return Promise.resolve();
  },
  getPendingTimers: () =>
    Promise.resolve(
      [...controls.bookings].map(([id, endAt]) => ({ id, endAt }))
    ),
  sendTest: () => {
    controls.tested++;
    return Promise.resolve();
  },
  onResume: (callback) => {
    controls.resume = callback;
    return () => {
      controls.resume = () => undefined;
    };
  },
  onNotificationAction: () => () => undefined,
};
const root = document.getElementById("root");
if (root === null) {
  throw new Error("Missing fixture root");
}
const renders = { settings: 0, clock: 0 };
Object.assign(window, { notificationRenders: renders });
export function SettingsProbe() {
  const settings = useAppStore((state) => state.settings);
  return <span hidden>{settings.theme}</span>;
}
export function ClockProbe() {
  const now = useAppStore((state) => state.now);
  return <span hidden>{now}</span>;
}
createRoot(root).render(
  <StrictMode>
    <AppStateProvider dependencies={deps}>
      <App />
      <Profiler
        id="settings"
        onRender={() => {
          renders.settings++;
        }}
      >
        <SettingsProbe />
      </Profiler>
      <Profiler
        id="clock"
        onRender={() => {
          renders.clock++;
        }}
      >
        <ClockProbe />
      </Profiler>
    </AppStateProvider>
  </StrictMode>
);
