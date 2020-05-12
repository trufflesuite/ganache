let _bigIntToBuffer: (val: bigint) => Buffer;
try {
  const toBufferBE = require("bigint-buffer").toBufferBE;
  _bigIntToBuffer = (val: bigint) => {
    const buffer = toBufferBE(val, 128);
    for (let i = 0; i < buffer.length - 1; i++) if (buffer[i]) return buffer.slice(i);
    return buffer.slice(buffer.length - 1);
  };
} catch (e) {
  _bigIntToBuffer = (val: bigint): Buffer => {
    const hex = val.toString(16);
    return Buffer.from(hex.length % 2 ? hex : `0${hex}`);
  };
}
export const bigIntToBuffer = _bigIntToBuffer;
