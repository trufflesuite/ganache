export type CliConfig = {
  options: {
    /**
     * Port for the server to listen on
     *
     * @defaultValue true
     */
    readonly port: {
      type: number;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use server.ws instead.
         */
        port: boolean;
      };
    };

    /**
     * Host for the server to bind to
     *
     * @defaultValue true
     */
    readonly host: {
      type: string;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use server.ws instead.
         */
        host: boolean;
      };
    };
  };
};
