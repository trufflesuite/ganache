export type GanachePlugin = {
  options: {
    server?: {
      port?: number;
    };
    provider?: any;
  };
  callback?: any;
};
