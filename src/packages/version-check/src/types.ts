export type BannerMessageOptions = {
  upgradeType: string;
  packageName: string;
  currentVersion: string;
  latestVersion: string;
};

export type VersionCheckConfig = {
  packageName?: string;
  enabled?: boolean;
  url?: string;
  ttl?: number;
  latestVersion?: string;
  latestVersionLogged?: string;
  lastNotification?: number;
  disableInCI?: boolean;
  didInit?: true;
};

export type ConfigManager = {
  get: Function;
  set: Function;
  path: string;
};
