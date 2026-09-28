import { createCompletionNotifications } from "./completionNotifications";
import type { CompletionNotificationDriver } from "./notificationDriver";
import type {
  NotificationPermission,
  NotificationPort,
} from "./notificationPort";

const completionTag = "one-slide-timer-completed";
const testTag = "one-slide-timer-test";

function permission(): NotificationPermission {
  if (!window.isSecureContext || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission === "default"
    ? "prompt"
    : Notification.permission;
}

async function notificationWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}notification-sw.js`
  );
  if (registration.active !== null) {
    return registration;
  }
  const worker = registration.installing ?? registration.waiting;
  if (worker === null) {
    throw new Error("Notification worker unavailable");
  }
  await new Promise<void>((resolve, reject) => {
    const changed = (): void => {
      if (worker.state === "activated" || worker.state === "redundant") {
        worker.removeEventListener("statechange", changed);
        if (worker.state === "activated") {
          resolve();
        } else {
          reject(new Error("Notification worker activation failed"));
        }
      }
    };
    worker.addEventListener("statechange", changed);
    changed();
  });
  return registration;
}

export function createBrowserNotifications(): NotificationPort {
  return createCompletionNotifications(createBrowserDriver());
}

export function createBrowserDriver(): CompletionNotificationDriver {
  const displayed = new Map<string, Notification>();
  let registration: Promise<ServiceWorkerRegistration> | undefined;
  const getWorker = (): Promise<ServiceWorkerRegistration> => {
    registration ??= notificationWorker().catch((error: unknown) => {
      registration = undefined;
      throw error;
    });
    return registration;
  };
  const show = async (
    body: string,
    tag: string,
    isCurrent: () => boolean
  ): Promise<void> => {
    const options = { body, tag };
    if ("serviceWorker" in navigator) {
      const worker = await getWorker();
      if (isCurrent() && permission() === "granted") {
        await worker.showNotification("One Slide Timer", options);
      }
      return;
    }
    if (isCurrent() && permission() === "granted") {
      displayed.get(tag)?.close();
      const notification = new Notification("One Slide Timer", options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      displayed.set(tag, notification);
    }
  };
  return {
    unsupportedReason:
      "이 환경에서는 기기 알림 API를 사용할 수 없어요. HTTPS와 브라우저 지원 여부를 확인해 주세요. 앱 내부 알림음은 사용할 수 있어요.",
    guidance: "",
    checkPermission: () => Promise.resolve(permission()),
    requestPermission: () => {
      if (permission() !== "prompt") {
        return Promise.resolve(permission());
      }
      // 사용자 클릭과 같은 호출 스택에서 브라우저 요청을 시작한다.
      return Notification.requestPermission().then(() => permission());
    },
    showCompleted: (timers, isCurrent) =>
      show(
        `${String(timers.length)}개의 타이머가 완료되었어요. 앱에서 확인해 주세요.`,
        completionTag,
        isCurrent
      ),
    clearCompleted: async (isCurrent) => {
      displayed.get(completionTag)?.close();
      displayed.delete(completionTag);
      if (permission() === "unsupported" || !("serviceWorker" in navigator)) {
        return;
      }
      // 권한 확인만으로 서비스 워커를 설치하지 않는다. 이전 실행의 알림도 정리한다.
      const worker = await navigator.serviceWorker.getRegistration(
        import.meta.env.BASE_URL
      );
      if (worker === undefined) {
        return;
      }
      const notifications = await worker.getNotifications({
        tag: completionTag,
      });
      if (isCurrent()) {
        notifications.forEach((notification) => notification.close());
      }
    },
    sendTest: (isCurrent = () => true) =>
      show("테스트 알림이에요.", testTag, isCurrent),
    onResume: (listener) => {
      const visible = (): void => {
        if (document.visibilityState === "visible") {
          listener();
        }
      };
      window.addEventListener("focus", listener);
      document.addEventListener("visibilitychange", visible);
      return () => {
        window.removeEventListener("focus", listener);
        document.removeEventListener("visibilitychange", visible);
      };
    },
  };
}
