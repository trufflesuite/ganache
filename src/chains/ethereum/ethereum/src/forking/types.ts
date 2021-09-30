import { PersistentCache } from "./persistent-cache/persistent-cache";

export interface Handler {
  request: <T>(
    method: string,
    params: unknown[],
    options: { noCache: boolean }
  ) => Promise<T>;
  setCache: (cache: PersistentCache) => void;
  close: () => Promise<void>;
}
