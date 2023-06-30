enum WebSocketCloseCodes {
  /**
   * Normal closure; the connection successfully completed whatever purpose for
   * which it was created.
   */
  CLOSE_NORMAL = 1000
  /**
   * Indicates that an endpoint is "going away", such as a server going down or
   * a browser having navigated away from a page.
   */
  // CLOSE_GOING_AWAY = 1001
  // CLOSE_PROTOCOL_ERROR = 1002,
  // CLOSE_ABNORMAL = 1006
}
export default WebSocketCloseCodes;
