const MAX_UINT32 = 0xffffffff;

/**
 * This is just Node's `Buffer.allocUnsafe`. I'm documenting it extra here to
 * draw attention to it. It is much faster the `Buffer.alloc(size)` because it
 * doesn't initialize its memory first. It's safe for us to use below because we
 * guarantee that we will fill every octet ourselves.
 *
 * Allocates a new buffer of {size} octets, leaving memory not initialized, so
 * the contents of the newly created Buffer are unknown and may contain
 * sensitive data.
 *
 * @param {number} - size count of octets to allocate
 */
const allocUnsafe = Buffer.allocUnsafe;

/**
 * Converts positive whole numbers that are 32 bits of fewer to a Buffer. Any
 * more bits and who knows what will happen!?!1?!
 *
 * @param num - A positive whole number less than 33 bits wide, i.e. a uint32.
 * @returns an optimally sized buffer holding `num` in big-endian order (LSB is
 * the _last_ value in the Buffer)
 */
function uint32ToBuf(num: number) {
  let buf: Buffer;

  /** `lsb` holds the Least Significant *byte* of `num`. It *technically* holds
   * all of `num`'s bytes but because of how UInt8Arrays (and thus Buffers)
   * work, only the least significant byte of each value gets used. */
  const lsb = num;

  // shift the first 8 least significant bits off current num, if it's non-zero
  // our value contains at least 2 bytes!
  if ((num >>>= 8)) {
    /** `second` now holds the second most least significant byte in its
     * "first" (right most) 8 bits */
    const second = num;

    // shift the next 8 least significant bits off current num, if it's non-zero
    // our value contains at least 3 bytes!
    if ((num >>>= 8)) {
      /** `third` now holds the third most least significant byte in its
       * "first" (right most) 8 bits */
      const third = num;
      if ((num >>>= 8)) {
        // since we have all 4 bytes, create a 4 byte Buffer and fill it with
        // our values!
        buf = allocUnsafe(4);
        // `num` here is just what is left after shifting off the 3 other bytes
        // like we did above
        buf[0] = num;
        buf[1] = third;
        buf[2] = second;
        buf[3] = lsb;
      } else {
        // since we only have 3 bytes, create a 3 byte Buffer and fill it with
        // our values!
        buf = allocUnsafe(3);
        buf[0] = third;
        buf[1] = second;
        buf[2] = lsb;
      }
    } else {
      // since we only have 2 bytes, create a 2 byte Buffer and fill it with
      // our values!
      buf = allocUnsafe(2);
      buf[0] = second;
      buf[1] = lsb;
    }
  } else {
    // We only have 1 byte, create a 1 byte Buffer and fill it with our only
    // value, lsb!
    buf = allocUnsafe(1);
    buf[0] = lsb;
  }

  // finally, return our optimally-sized Buffer!
  return buf;
}

/**
 * Converts positive whole numbers less than or equal to
 * `Number.MAX_SAFE_INTEGER` to a Buffer. If your value is less than 2**32 you
 * should use `uint32ToBuf` instead.
 *
 * @param num - A positive whole number <= `Number.MAX_SAFE_INTEGER`
 * @returns an optimally sized buffer holding `num` in big-endian order (LSB is
 * the _last_ value in the Buffer)
 */
function uintWideToBuf(num: number) {
  // This function is similar to `uint32ToBuf`, but splits the number into its
  // 32 lowest bits and its 32 highest bits. We have to do this because numeric
  // Bitwise operations can only operate on 32 bit-wide values.
  // There are some differences, but if you first grasp `uint32ToBuf`, you can
  // handle this just fine.

  let buf: Buffer;

  /** If we are in this function we are probably > 32 bits wide, so we need to
   * first convert this value to BigInt in order to shift off those high bits.
   * Now that I'm documenting this, we could probably just subtract `2**32` from
   * `num` to avoid the conversion overhead (BigInts are slower than numbers) */
  let hi = Number(BigInt(num) >> 32n);

  const hiLsb = hi;
  let offset = 0;

  // the high bits determine the size of the Buffer, so we compute the high bits
  // first
  if ((hi >>>= 8)) {
    const six = hi;
    if ((hi >>>= 8)) {
      const five = hi;
      if ((hi >>>= 8)) {
        buf = allocUnsafe(8);
        buf[0] = hi; // msb
        buf[1] = five;
        buf[2] = six;
        buf[3] = hiLsb;
        offset = 7;
      } else {
        buf = allocUnsafe(7);
        buf[0] = five; // msb
        buf[1] = six;
        buf[2] = hiLsb;
        offset = 6;
      }
    } else {
      buf = allocUnsafe(6);
      buf[0] = six; // msb
      buf[1] = hiLsb;
      offset = 5;
    }
  } else {
    buf = allocUnsafe(5);
    buf[0] = hiLsb; // msb
    offset = 4;
  }

  // set the low bytes:
  let lo = num & MAX_UINT32;
  const lsb = lo;
  if ((lo >>>= 8)) {
    const two = lo;
    if ((lo >>>= 8)) {
      const one = lo;
      buf[offset - 3] = lo >>>= 8;
      buf[offset - 2] = one;
      buf[offset - 1] = two;
      buf[offset] = lsb;
    } else {
      buf[offset - 3] = 0;
      buf[offset - 2] = 0;
      buf[offset - 1] = two;
      buf[offset] = lsb;
    }
  } else {
    buf[offset - 3] = 0;
    buf[offset - 2] = 0;
    buf[offset - 1] = 0;
    buf[offset] = lsb;
  }
  return buf;
}

/**
 * Converts a JavaScript number, treated as a Whole Number (0, 1, 2, 3, 4, ...)
 * less than 64 bits wide, to a Buffer.
 *
 * Numbers that are negative, fractional, or greater than 64 bits wide will
 * return very unexpected results. Numbers that are greater than
 * `Number.MAX_SAFE_INTEGER` will return unexpected results.
 *
 * @param num - A positive whole number <= `Number.MAX_SAFE_INTEGER`
 */
export function uintToBuffer(num: number) {
  return num > MAX_UINT32 ? uintWideToBuf(num) : uint32ToBuf(num);
}
