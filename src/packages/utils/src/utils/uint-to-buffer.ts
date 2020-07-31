const MAX_UINT32 = 0xffffffff;
const allocUnsafe = Buffer.allocUnsafe;

function uint32ToBuf(value: number) {
  // if value is 32 bits or fewer
  let buf: Buffer;
  const three = value;
  if (value >>>= 8) {
    const two = value;
    if (value >>>= 8) {
      const one = value;
      if (value >>>= 8) {
        buf = allocUnsafe(4);
        buf[0] = value;
        buf[1] = one;
        buf[2] = two;
        buf[3] = three;
      } else {
        buf = allocUnsafe(3);
        buf[0] = one;
        buf[1] = two;
        buf[2] = three;
      }
    } else {
      buf = allocUnsafe(2);
      buf[0] = two;
      buf[1] = three;
    }
  } else {
    buf = allocUnsafe(1);
    buf[0] = three;
  }
  return buf;
}

/**
 * Converts unsigned integers that are wider than 32 bits but smaller than 64.
 * @param value 
 */
function uintWideToBuf(value: number) {
  // for values larger than 32 bits, we need to convert to a BigInt to get the
  // the high bits:
  let hi = Number(BigInt(value) >> 32n);
  const hiLsb = hi;
  let buf: Buffer;
  let offset = 0;
  // the high bits determine the size of the Buffer, so we compute the high bits
  // first
  if (hi >>>= 8) {
    const six = hi;
    if (hi >>>= 8) {
      const five = hi;
      if (hi >>>= 8) {
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
  let lo = value & MAX_UINT32;
  const lsb = lo;
  if (lo >>>= 8) {
    const two = lo;
    if (lo >>>= 8) {
      const one = lo;
      buf[offset-3] = (lo >>>= 8);
      buf[offset-2] = one;
      buf[offset-1] = two;
      buf[offset] = lsb;
    } else {
      buf[offset-3] = 0;
      buf[offset-2] = 0;
      buf[offset-1] = two;
      buf[offset] = lsb;
    }
  } else {
    buf[offset-3] = 0;
    buf[offset-2] = 0;
    buf[offset-1] = 0;
    buf[offset] = lsb;
  }
  return buf;
}

/**
 * Converts a JavaScript number, treated as a Whole Numbers (0, 1, 2, 3, 4, ...)
 * less than 64 bits wide, to a Buffer.
 * 
 * Numbers that are negative, fractional, or greater than 64 bits wide will
 * return very unexpected results. Numbers that are greater than
 * `Number.MAX_SAFE_INTEGER` will return unexpected results.
 * 
 * @param value 
 */
export function uintToBuffer(value: number) {
  return value > MAX_UINT32 ? uintWideToBuf(value) : uint32ToBuf(value);
}
