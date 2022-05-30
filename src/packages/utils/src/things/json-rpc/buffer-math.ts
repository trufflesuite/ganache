
let workingBuffer = Buffer.allocUnsafe(128);
let workingBufferMaxIndex = workingBuffer.length - 1;

export function getWorkingBufferSize(): number {
  return workingBuffer.length;
}

function copyFromWorkingBufferRHS(byteOffset: number): Buffer {
  const result = Buffer.allocUnsafe(byteOffset);
  workingBuffer.copy(result, 0, workingBufferMaxIndex - byteOffset, workingBufferMaxIndex);
  return result;
}

// todo: we could try a uint8array here, but we can't .copy() from it directly
// maybe we could try a pooled-buffer, but I suspect we would end up
// churning the buffer pool which we throw away after use anyways.

function reallocateWorkingBuffer(usedSize: number) {
  // usedSize is the number of bytes that are required for the current operation
  // we allocate twice this, to ensure that we continue to have plenty of headspace
  const newSize = usedSize * 2;
  workingBuffer = Buffer.allocUnsafe(newSize);
  workingBufferMaxIndex = newSize - 1;
}

export function addNumberToBuffer(buff: Buffer, addend: number) {
  if (addend === 0 && buff.length === 0) {
    return Buffer.alloc(1);
  }

  const buffLength = buff.length;
  if (buffLength >= workingBufferMaxIndex) {
    reallocateWorkingBuffer(buffLength);
  }
  // offset from RHS of input buffer
  let byteOffset = 0;
  while (addend > 0 || byteOffset < buffLength) {
    // add the remainder onto the current byte from the input buffer (may be in excess of 0xff)
    const currByte = (buff[buffLength - byteOffset++ - 1] || 0) + addend;

    // fill workingBuffer with the result from the RHS
    const ix = workingBufferMaxIndex - byteOffset;
    workingBuffer[ix] = currByte % 0x100;

    // move currByte right 8 bits, allowing the smallest byte to fall off the end
    // and carry it as the addend to the next byte
    addend = currByte >>> 8;
  }

  return copyFromWorkingBufferRHS(byteOffset);
}

export function addBigIntToBuffer(buff: Buffer, addend: bigint) {
  if (addend === 0n && buff.length === 0) {
    return Buffer.alloc(1);
  }

  const buffLength = buff.length;
  if (buffLength >= workingBufferMaxIndex) {
    reallocateWorkingBuffer(buffLength);
  }
  // offset from RHS of input buffer
  let byteOffset = 0;
  while (addend > 0 || byteOffset < buffLength) {
    // add the remainder onto the current byte from the input buffer (may be in excess of 0xff)
    const currByte = BigInt(buff[buffLength - byteOffset++ - 1] || 0) + addend;

    // fill workingBuffer with the result from the RHS
    const ix = workingBufferMaxIndex - byteOffset;
    workingBuffer[ix] = Number(currByte % 0x100n);

    // move currByte right 8 bits, allowing the smallest byte to fall off the end
    // and carry it as the addend to the next byte
    addend = currByte >> 8n;
  }

  return copyFromWorkingBufferRHS(byteOffset);
}

export function addUint8ArrayToBuffer(buff: Buffer, addend: Uint8Array) {
  const buffLength = buff.length,
    addendLength = addend.length,
    maxLength = Math.max(buffLength, addendLength);

  if (maxLength >= workingBufferMaxIndex) {
    reallocateWorkingBuffer(maxLength);
  }
  // offset from RHS of input buffer
  let byteOffset = 0;
  let carry = 0;
  while (carry > 0 || byteOffset < maxLength) {
    // add the remainder onto the current byte from the input buffer (may be in excess of 0xff)
    const currByte = (addend[addendLength - byteOffset - 1] || 0) + (buff[buffLength - byteOffset - 1] || 0) + carry;
    byteOffset += 1;

    // fill workingBuffer with the result from the RHS
    const ix = workingBufferMaxIndex - byteOffset;
    workingBuffer[ix] = Number(currByte % 0x100);

    // move currByte right 8 bits, allowing the smallest byte to fall off the end
    // and carry it as the addend to the next byte
    carry = currByte >>> 8;
  }

  return copyFromWorkingBufferRHS(byteOffset);
}
