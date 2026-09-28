export type StorageState = {
  read: "unread" | "ready" | "failed";
  writeFailed: boolean;
  dirty: boolean;
};

export const initialStorageState = (): StorageState => ({
  read: "unread",
  writeFailed: false,
  dirty: false,
});

export const storageFailed = (state: StorageState): boolean =>
  state.read === "failed" || state.writeFailed;
