import Options from "./options";

export default class ServerOptions extends Options {
  /**
   * The number of milliseconds of inactivity the http server needs to wait for
   * additional incoming data, after it has finished writing the last response, 
   * before a socket will be destroyed. This does not affect the websocket 
   * server.
   * 
   * A value of 0 will disable the keep-alive timeout behavior on incoming connections.
  */
 public readonly keepAliveTimeout: number = 5000

   /**
   * Port number to listen on when running as a server. Defaults to `8545`
   */
  public readonly port: number = 8545

  /**
   * Enable a websocket server. This is `true` by default.
   */
  public ws: boolean = true

  /**
   * Array of strings to installed subproviders
   */
  public subProviders: string[]
}
