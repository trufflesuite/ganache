// 1001 indicates that an endpoint is "going away", such as a server
// going down or a browser having navigated away from a page.
enum WebSocketCloseCodes {
  CLOSE_GOING_AWAY = 1001,
  CLOSE_PROTOCOL_ERROR = 1002
}
export default WebSocketCloseCodes;
