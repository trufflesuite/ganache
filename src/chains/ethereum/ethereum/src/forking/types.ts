export interface Handler {
  request: <T>(method: string, params: unknown[]) => Promise<T>;
  close: () => Promise<void>;
}
