import { useContext } from "react";
import { useStore } from "zustand";

import { AppContext } from "./appContext";
import type { AppState } from "./state/appStore";

function useAppContext() {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error("AppStateProvider is required.");
  }
  return context;
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(useAppContext().store, selector);
}

export function useAppActions() {
  return useAppContext().actions;
}
