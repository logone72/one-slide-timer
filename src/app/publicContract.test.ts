import { expectTypeOf, it } from "vitest";

import type { AppActions } from "./appRuntime";
import type { AppState } from "./state/appStore";
import type { useAppActions } from "./useAppState";

it("exposes user commands without store mutation or hydration escape hatches", () => {
  expectTypeOf<ReturnType<typeof useAppActions>>().toEqualTypeOf<AppActions>();
  expectTypeOf<
    Extract<
      keyof AppActions,
      | "setState"
      | "getState"
      | "restoreTimers"
      | "restoreSettings"
      | "recordTimersWrite"
      | "recordSettingsWrite"
      | "replaceTimers"
      | "setNow"
      | "updateNotifications"
      | "setNotificationPreference"
    >
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Extract<keyof AppState, "actions" | "setState">
  >().toEqualTypeOf<never>();
});
