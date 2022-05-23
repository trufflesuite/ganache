export function* getFragmentGenerator(
  data: Generator<Buffer, any, unknown>,
  value: Buffer,
  bufferSize: number
) {
  // Use a large buffer to reduce round-trips
  let buf = Buffer.allocUnsafe(bufferSize);
  let offset = 0;
  let done = false;
  do {
    const length = value.byteLength;
    if (offset > 0 && length + offset > bufferSize) {
      yield buf.subarray(0, offset);
      // Reset the buffer. Since `uws` sends packets asynchronously,
      // it is important that we allocate a new buffer for the next
      // frame. This avoids overwriting data before it is sent. The
      // reason we need to do this is likely because we do not yet
      // handle backpressure. Part of handling backpressure will
      // involve the drain event and only sending while
      // `ws.getBufferedAmount() < ACCEPTABLE_BACKPRESSURE`.
      // See https://github.com/trufflesuite/ganache/issues/FIX THIS
      buf = null;
      offset = 0;
    }
    // Store prev in buffer if it fits (but don't store it if it is the exact
    // same size as bufferSize)
    if (length < bufferSize) {
      // copy from value into buffer
      if (buf === null) buf = Buffer.allocUnsafe(bufferSize);
      value.copy(buf, offset, 0, length);
      offset += length;
    } else {
      // Cannot fit this fragment in buffer, send it directly.
      // Buffer has just been flushed so we do not need to worry about
      // out-of-order send.
      yield value;
    }
  } while (({ value, done } = data.next()) && !done);

  // If we've got anything buffered at this point, send it.
  if (offset > 0) yield buf.subarray(0, offset);
}
