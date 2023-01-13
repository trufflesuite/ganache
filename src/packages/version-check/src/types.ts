export type BannerMessageOptions = {
  upgradeType: string;
  packageName: string;
  currentVersion: string;
  latestVersion: string;
};

export type VersionCheckOptions = {
  packageName?: string;
  enabled?: boolean;
  url?: string;
  ttl?: number;
  latestVersion?: string;
  lastVersionLogged?: string;
  lastNotification?: number;
  disableInCI?: boolean;
};

export type CLIConfig = {
  versionCheck: VersionCheckOptions;
};

export type ConfigManager = {
  get: Function;
  set: Function;
  path: string;
};

export type ConfigFileManagerOptions = {
  defaultConfig?: AnyJSON;
  config?: AnyJSON;
};

export type AnyJSON = {
  [key: string]: string | number | boolean;
};
