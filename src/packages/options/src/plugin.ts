export type GanachePlugin = {
  options: {
    server?: {
      port?: number;
      defaultServerOptions: any;
    };
    provider?: any;
  };
  callback?: any;
};
