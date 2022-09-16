export type ServerConfig = {
  options: {
    /**
     * Enable a websocket server.
     *
     * @defaultValue true
     */
    readonly ws: {
      type: boolean;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use server.ws instead.
         */
        ws: boolean;
      };
    };

    /**
     * Whether or not websockets should response with binary data (ArrayBuffers) or
     * strings.
     *
     * Default is "auto", which responds using the same format as the incoming
     * message that triggered the response.
     *
     * @defaultValue "auto"
     */
    readonly wsBinary: {
      type: boolean | "auto";
      hasDefault: true;
    };

    /**
     * Defines the endpoint route the HTTP and WebSocket servers will listen on.
     *
     * @defaultValue "/"
     */
    readonly rpcEndpoint: {
      type: string;
      hasDefault: true;
    };

    /**
     * For memory and performance reasons ganache may respond with chunked
     * transfer-encoding over HTTP and fragmented send over WebSockets.
     * This option allows you to control the approximate size of each chunk.
     * The default is 1MB.
     */
    readonly chunkSize: {
      type: number;
      hasDefault: true;
    };
  };
};
