import { createContext } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { AppActions } from "./appRuntime";
import type { AppState } from "./state/appStore";

export const AppContext = createContext<{
  store: StoreApi<AppState>;
  actions: AppActions;
} | null>(null);
