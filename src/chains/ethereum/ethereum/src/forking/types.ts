import { PersistentCache } from "./persistent-cache/persistent-cache";

export interface Handler {
  request: <T>(
    method: string,
    params: unknown[],
    options: { disableCache: boolean; batch: boolean }
  ) => Promise<T>;
  batch?: <T>(
    method: string,
    params: unknown[],
    options: { disableCache: boolean; batch: boolean }
  ) => Promise<T>;
  setCache: (cache: PersistentCache) => void;
  close: () => Promise<void>;
}
