import { type ReactNode, useLayoutEffect, useState } from "react";

import { AppContext } from "./appContext";
import { type AppDependencies, browserDependencies } from "./appDependencies";
import { createAppRuntime } from "./appRuntime";
import { createAppStore } from "./state/appStore";

export function AppStateProvider({
  children,
  dependencies,
}: {
  children: ReactNode;
  dependencies?: AppDependencies;
}) {
  const [instance] = useState(() => {
    const store = createAppStore();
    const runtime = createAppRuntime(
      store,
      dependencies ?? browserDependencies()
    );
    return { runtime, context: { store, actions: runtime.actions } };
  });
  useLayoutEffect(() => {
    instance.runtime.start();
    return instance.runtime.stop;
  }, [instance]);
  return <AppContext value={instance.context}>{children}</AppContext>;
}
