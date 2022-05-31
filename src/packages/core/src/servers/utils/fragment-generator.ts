export function* getFragmentGenerator(
  data: Generator<Buffer, void, void>,
  bufferSize: number
): Generator<Buffer> {
  // Use a large buffer to reduce round-trips
  let buf = Buffer.allocUnsafe(bufferSize);
  let offset = 0;

  for (const value of data) {
    const { byteLength } = value;
    // if we don't have enough space in the buffer for this next value `yield`
    // the buffer as is.
    if (offset > 0 && byteLength + offset > bufferSize) {
      yield buf.subarray(0, offset);
      // Reset the buffer. Since `uws` sends packets asynchronously,
      // it is important that we allocate a new buffer for the next
      // frame. This avoids overwriting data before it is sent. The
      // reason we need to do this is likely because we do not yet
      // handle backpressure. Part of handling backpressure will
      // involve the drain event and only sending while
      // `ws.getBufferedAmount() < ACCEPTABLE_BACKPRESSURE`.
      // See https://github.com/trufflesuite/ganache/issues/2790
      buf = null;
      offset = 0;
    }

    // Store value in buffer if it fits (but don't store it if it is the exact
    // same size as bufferSize)
    if (byteLength < bufferSize) {
      // copy from value into buffer
      if (buf === null) buf = Buffer.allocUnsafe(bufferSize);
      value.copy(buf, offset, 0, byteLength);
      offset += byteLength;
    } else {
      // Cannot fit this value in buffer, send it directly.
      // Buffer has just been flushed (since the condition `byteLength + offset > bufferSize`
      // will always be true here, which will have triggered the flush above) so
      // we do not need to worry about out-of-order send.
      yield value;
    }
  }

  // If we've got anything buffered at this point, send it.
  if (offset > 0) yield buf.subarray(0, offset);

  return void 0;
}
