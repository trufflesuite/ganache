const contentLength = Buffer.from("content-length", "utf8");
const contentLengthTitleCase = Buffer.from("Content-Length", "utf8");
const contentLengthByteLength = contentLength.byteLength
const transferEncoding = Buffer.from("transfer-encoding", "utf8")
const transferEncodingTitleCase = Buffer.from("transfer-encoding", "utf8")
const transferEncodingByteLength = transferEncoding.byteLength;

const INVALID_CONTENT_LENTH_HEADER_MESSAGE = "Invalid Content-Length header detected";
const POSSIBLE_REQUEST_SMUGGLING_ERROR_MESSAGE = "Possible HTTP request smuggling attempt detected. Multiple Content-Length headers with different values found and Transfer-Encoding header was not present.";

export type Handlers = {
  onData: (message: Buffer) => boolean;
  onComplete: (trailers: string[]) => Buffer;
};

function handleLengthedResponse(length: number): Handlers {
  const buffer = Buffer.allocUnsafe(length);
  let offset = 0;

  return {
    onData: (message: Buffer) => {
      const messageLength = message.byteLength;
      // note: Node will NOT send us more data than the content-length header
      // denotes, so we don't have to worry about it.
      message.copy(buffer, offset, 0, messageLength);
      offset += messageLength;
      return true;
    },
    onComplete: (_trailers: string[]) => {
      // note: Node doesn't check if the content-length matches, so we do that
      // here
      if (offset !== buffer.length) {
        // if we didn't receive enough data, throw
        throw new Error("content-length mismatch");
      } else {
        return buffer;
      }
    }
  }
}

function handleChunkedResponse(): Handlers {
  let buffer: Buffer;
  return {
    onData: (message: Buffer) => {
      const chunk = message;
      if (buffer) {
        buffer = Buffer.concat([buffer, chunk], buffer.length + chunk.length);
      } else {
        buffer = Buffer.concat([chunk], chunk.length);
      }
      return true;
    },

    onComplete: (trailers: string[]) => {
      return buffer;
    }
  };
}

/**
 * Determines if the given headers contain a valid `content-length` header. If
 * they do, the content-length value is returned. Otherwise, `-1` is returned.
 * If the content-length header is invalid and a Transfer-Encoding header was
 * not found an error is thrown.
 * @param headers an flat array of headers names and value (e.g.
 * `["content-length", "123", "transfer-encoding", "chunked"]`, but with buffers
 * instead of strings).
 * @returns 
 * @throws
 */
export function determineHandlerType(headers: Buffer[]): number {
  // Messages MUST NOT include both a Content-Length header field and a
  // non-identity transfer-coding. If the message does include a non-identity
  // transfer-coding, the Content-Length MUST be ignored.
  // (RFC 2616, Section 4.4)
  let foundContentLength = -1;
  let contentLengthError: Error = null;
  headerLoop:
  for (let i = 0, l = headers.length; i < l; i += 2) {
    const header = headers[i];
    const headerLength = header.byteLength;
    if (headerLength === transferEncodingByteLength) {
      const isTransferEncoding = Buffer.compare(header, transferEncoding) === 0 || Buffer.compare(header, transferEncodingTitleCase) === 0;
      if (!isTransferEncoding) {
        // we might still be transfer-encoding, but with weird casing
        // check in a case-insensitive way, and at first sign of mismatch bail
        // back to the header loop
        for (let j = 0; j < headerLength; j++) {
          const letter = header[j];
          if (letter >= 65 && letter <= 90) {
            if (letter + 32 !== transferEncoding[j]) {
              continue headerLoop;
            }
          } else if (letter !== transferEncoding[j]) {
            continue headerLoop;
          }
        }
      }

      // If a Transfer-Encoding header field (section 14.41) is present and
      // has any value other than "identity", then the transfer-length is
      // defined by use of the "chunked" transfer-coding (section 3.6), unless
      // the message is terminated by closing the connection.
      // So even if the value is "identity", we still treat it as chunked, as
      // there is no way to determine the length of the message. (RFC 2616
      // section 4.4 paragraph 3 states: If a message is received with both a
      // Transfer-Encoding header field and a Content-Length header field, the
      // latter MUST be ignored.)
      return -1;
    } else if (headerLength === contentLengthByteLength) {
      const isContentLength = Buffer.compare(header, contentLength) === 0 || Buffer.compare(header, contentLengthTitleCase) === 0;
      if (!isContentLength) {
        // we might still be content-length, but with weird casing
        // check in a case-insensitive way, and at first sign of mismatch bail
        // back to the header loop
        for (let j = 0; j < headerLength; j++) {
          const letter = header[j];
          if (letter >= 65 && letter <= 90) {
            if (letter + 32 !== transferEncoding[j]) {
              continue headerLoop;
            }
          } else if (letter !== transferEncoding[j]) {
            continue headerLoop;
          }
        }
      }

      // if a Content-Length header field (section 14.13) is present, its
      // decimal value in OCTETs represents both the entity-length and the
      // transfer-length. The Content-Length header field MUST NOT be sent
      // if these two lengths are different (i.e., if a Transfer-Encoding
      // header field is present). If a message is received with both a
      // non-identity Transfer-Encoding header field and a Content-Length
      // header field, the latter MUST be ignored.

      // If a message is received that has multiple Content-Length header
      // fields with field-values consisting of the same decimal value, or
      // a single Content-Length header field with a field value containing
      // a list of identical decimal values (e.g., "Content-Length: 42,
      // 42"), indicating that duplicate Content-Length header fields have
      // been generated or combined by an upstream message processor, then
      // the recipient MUST either reject the message as invalid or replace
      // the duplicated field-values with a single valid Content-Length
      // field containing that decimal value prior to determining the
      // message body length or forwarding the message.
      // https://www.rfc-editor.org/rfc/rfc7230#section-3.3.2

      // A Content-Length header can have multiple values, so we split on ","
      // and make sure they are all the same value (if not, the connection is
      // invalid and must be closed)
      const lengths = headers[i + 1].toString("utf8").split(/\s*,\s*/);
      const lengthStr = lengths[0];
      for (let i = 1, l = lengths.length; i < l; i++) {
        // If a message is received without Transfer-Encoding and with
        // either multiple Content-Length header fields having differing
        // field-values or a single Content-Length header field having an
        // invalid value, then the message framing is invalid and the
        // recipient MUST treat it as an unrecoverable error.  If this is a
        // request message, the server MUST respond with a 400 (Bad Request)
        // status code and then close the connection. If this is a response
        // message received by a proxy, the proxy MUST close the connection
        // to the server, discard the received response, and send a 502 (Bad
        // Gateway) response to the client. If this is a response message
        // received by a user agent, the user agent MUST close the
        // connection to the server and discard the received response.
        if (lengthStr !== lengths[i]) {
          contentLengthError = new Error(POSSIBLE_REQUEST_SMUGGLING_ERROR_MESSAGE);
          continue;
        }
      }

      // only allow numbers in the content-length header's value, otherwise
      // reject the message and the connection
      // https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html section 14.13
      const isValidLength = /^[0-9]+/.test(lengthStr);
      if (isValidLength) {
        const contentLength = parseInt(lengthStr);
        // if we have already seen a valid content-length header, we must
        // match it, otherwise we MUST close the connection to the server
        // and discard the received response.
        if (foundContentLength !== -1 && foundContentLength !== contentLength) {
          contentLengthError = new Error(POSSIBLE_REQUEST_SMUGGLING_ERROR_MESSAGE);
          continue;
        } else {
          // we have a valid content-length; but we can't yet assume that we
          // can use it, since if Transfer-Encoding is eventually set
          // Content-Length must be ignored
          foundContentLength = contentLength;
          continue;
        }
      } else {
        contentLengthError = new Error(INVALID_CONTENT_LENTH_HEADER_MESSAGE);
        continue;
      }
    }
  }

  if (contentLengthError) {
    throw contentLengthError;
  } else if (foundContentLength >= 0) {
    // we have a valid content-length we can use it to pre-allocate the required
    // memory
    return foundContentLength;
  } else {
    return -1;
  }
}

/**
 * Gets handlers based if the given headers contain a valid `content-length`
 * header.
 * @param headers an flat array of headers names and value (e.g.
 * `["content-length", "123", "transfer-encoding", "chunked"]`, but with buffers
 * instead of strings).
 * @returns
 * @throws Throws if the headers are invalid.
 */
export function getHandlers(headers: Buffer[]): Handlers {
  const lengthOrChunked = determineHandlerType(headers);
  if (lengthOrChunked === -1) {
    return handleChunkedResponse();
  } else {
    return handleLengthedResponse(lengthOrChunked);
  }
}