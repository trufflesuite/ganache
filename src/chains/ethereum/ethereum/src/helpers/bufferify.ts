const PARTS = Buffer.from('[]{},"":null');
const SQUARE_BRACKET_PAIR = PARTS.slice(0, 2);
const SQUARE_BRACKET_OPEN = SQUARE_BRACKET_PAIR.slice(0, 1);
const SQUARE_BRACKET_CLOSE = SQUARE_BRACKET_PAIR.slice(1, 2);
const CURLY_BRACKET_PAIR = PARTS.slice(2, 4);
const CURLY_BRACKET_OPEN = CURLY_BRACKET_PAIR.slice(0, 1);
const CURLY_BRACKET_CLOSE = CURLY_BRACKET_PAIR.slice(1, 2);
const COMMA_QUOTE = PARTS.slice(4, 6);
const COMMA = COMMA_QUOTE.slice(0, 1);
const QUOTE_PAIR = PARTS.slice(5, 7);
const QUOTE_COLON = PARTS.slice(6, 8);
const COLON = QUOTE_COLON.slice(1, 2);
const NULL = PARTS.slice(8, 12);
const _EMPTY = PARTS.slice(0, 0);

const toStr = Object.prototype.toString;
const isObj = (val: any) => toStr.call(val) === "[object Object]";

function numberToBuffer(value: number) {
  const str = value.toString();
  const l = str.length;
  if (l > 0) {
    const buf = Buffer.allocUnsafe(l);
    (buf as any).utf8Write(str, 0, l);
    return buf;
  } else {
    return _EMPTY;
  }
}

function stringToQuotedBuffer(value: string) {
  const length = value.length;
  if (length > 0) {
    const l = length + 2;
    const buf = Buffer.allocUnsafe(l);
    buf[0] = 34; // QUOTE
    buf[length + 1] = 34; // QUOTE
    (buf as any).utf8Write(value, 1, length);
    return buf;
  } else {
    return QUOTE_PAIR;
  }
}
function arrayToBuffer(value: any[]) {
  const l = value.length;
  if (l === 0) {
    return SQUARE_BRACKET_PAIR;
  } else {
    const chunkified = bufferify(value[0], "0");
    const jsonVal = chunkified.length === 0 ? NULL : chunkified;
    // if the value ends up being nothing (undefined), return null
    const bufs = [SQUARE_BRACKET_OPEN, jsonVal];
    let length = 2 + jsonVal.length; // 2 = `[` and `]`
    if (l > 1) {
      for (let i = 1; i < l; i++) {
        const chunkified = bufferify(value[i], i.toString());
        const chunkLength = chunkified.length;
        if (chunkLength === 0) {
          // if the value ends up being nothing (undefined), return null
          bufs.push(COMMA, NULL);
          length += 5;
        } else {
          bufs.push(COMMA, chunkified);
          length += chunkLength + 1;
        }
      }
    }
    bufs.push(SQUARE_BRACKET_CLOSE);
    return Buffer.concat(bufs, length);
  }
}
function bufferToQuotedBuffer(value: Buffer) {
  const length = value.length;
  const buf = Buffer.allocUnsafe(length + 2);
  buf[0] = 34;
  value.copy(buf, 1, 0, length);
  buf[length + 1] = 34;
  return buf;
}

function objectToBuffer(value: any, nameOrIndex: string) {
  if ("toJSON" in value)
    return bufferify(value.toJSON(nameOrIndex), nameOrIndex) as Buffer;

  const entries = Object.entries(value);
  const l = entries.length;
  if (l === 0) {
    return CURLY_BRACKET_PAIR;
  } else {
    let i = 0;
    let length = 2; // 2 == `{` and `}`
    const bufs = [CURLY_BRACKET_OPEN];

    // find the first non-null property to start the object
    while (i < l) {
      const [key, value] = entries[i];
      i++;
      const chunkified = bufferify(value, key);
      // if the chunkified value ends up being nothing (undefined) ignore
      // the property
      const chunkLength = chunkified.length;
      if (chunkLength === 0) {
        continue;
      }

      bufs.push(stringToQuotedBuffer(key), COLON, chunkified);
      length += key.length + 2 + 1 + chunkLength;
      break;
    }
    if (l > 1) {
      for (; i < l; i++) {
        const [key, value] = entries[i];
        const chunkified = bufferify(value, key);
        // if the chunkified value ends up being nothing (undefined) ignore
        // the property
        const chunkLength = chunkified.length;
        if (chunkLength === 0) continue;

        bufs.push(COMMA, stringToQuotedBuffer(key), COLON, chunkified);
        length += 2 + key.length + 2 + chunkLength;
      }
    }
    bufs.push(CURLY_BRACKET_CLOSE);
    return Buffer.concat(bufs, length);
  }
}

/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) Buffer
 * (utf-8 encoded).
 *
 * This is a hack. It:
 *  * Does not support circular references.
 *  * Does not support double quotes within Object keys; just stick with ascii
 *  * Probably doesn't support non-ASCII characters
 *  * Is only tested on transaction traces
 *
 * Only useful if the `JSON.stringify`ed version would create a string larger
 * than what the JavaScript engine can handle.
 *
 * What is the maximum string size in Node/V8? It depends on the version! Some
 * versions are 256MB, some are ~1GB, and others are ~0.5GB.
 * See: https://stackoverflow.com/a/47781288/160173
 *
 * CAUTION: This method is approx 3 - 20 times slower than using:
 * `Buffer.from(JSON.stringify(value), "utf-8")`
 *
 * @param value A JavaScript value, usually an object or array, to be converted.
 * @param nameOrIndex JSON.stringify calls an object's toJSON method, and this
 * property is used by internal recursive calls to bufferify.
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior
 */
export function bufferify(value: any, nameOrIndex: string) {
  const type = typeof value;
  if (type === "number" || type === "boolean") {
    return numberToBuffer(value);
  } else if (type === "string") {
    return stringToQuotedBuffer(value);
  } else if (Buffer.isBuffer(value)) {
    return bufferToQuotedBuffer(value);
  } else if (Array.isArray(value)) {
    return arrayToBuffer(value);
  } else if (isObj(value)) {
    return objectToBuffer(value, nameOrIndex);
  } else if (value === null) {
    return NULL;
  } else if (type === "undefined") {
    // nothing is returned for undefined
    return _EMPTY;
  } else {
    throw new Error("unsupported value in bufferify");
  }
}
