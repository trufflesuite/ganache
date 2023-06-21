export const BUFFER_256_ZERO = Buffer.allocUnsafe(256).fill(0);
export const ACCOUNT_ZERO = BUFFER_256_ZERO.slice(0, 20);
export const BUFFER_EMPTY = Buffer.allocUnsafe(0);
export const BUFFER_ZERO = BUFFER_256_ZERO.slice(0, 1);
export const BUFFER_32_ZERO = BUFFER_256_ZERO.slice(0, 32);
export const BUFFER_8_ZERO = BUFFER_256_ZERO.slice(0, 8);

export const WEI = 1000000000000000000n as const;

export const KNOWN_CHAINIDS = new Set([1, 3, 4, 5, 42, 11155111]);

/**
 * Buffer representation of the string "version":
 */
export const VERSION_KEY = Buffer.from([118, 101, 114, 115, 105, 111, 110]);
