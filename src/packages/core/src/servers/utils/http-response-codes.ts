/**
 * HTTP/1.1 Response Status-Codes, including the _required_ space character.
 *
 * e.g., `"200 "` or `"404 "`
 *
 * RFC Grammar:
 *
 * ```ebnf
 * Status-Line = HTTP-Version SP Status-Code SP Reason-Phrase CRLF
 * ```
 *
 * The Status-Codes defined here fullfill the `Status-Code SP` part of the above
 * grammar.
 *
 * See https://datatracker.ietf.org/doc/html/rfc2616#section-6.1 for details.
 */
enum HttpResponseCodes {
  OK = "200 ",
  NO_CONTENT = "204 ",
  BAD_REQUEST = "400 ",
  NOT_FOUND = "404 ",
  METHOD_NOT_ALLOWED = "405 ",
  IM_A_TEAPOT = "418 "
}
export default HttpResponseCodes;
