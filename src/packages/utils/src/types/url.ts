// TypeScript 4.1.2 doesn't think `URL` is a node global
// And no, the `import {URL} from 'url';` trick doesn't work, despite what The
// Internet tells you, as that imports the "Legacy URL API", not the WHATWG URL
// API.

/** The URL interface represents an object providing static methods used for creating object URLs. */
export interface URL {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  toString(): string;
  readonly origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  readonly searchParams: URLSearchParams;
  username: string;
  toJSON(): string;
}

export declare var URL: {
  prototype: URL;
  new (url: string, base?: string | URL): URL;
  createObjectURL(object: any): string;
  revokeObjectURL(url: string): void;
};

export interface URLSearchParams {
  /**
   * Appends a specified key/value pair as a new search parameter.
   */
  append(name: string, value: string): void;
  /**
   * Deletes the given search parameter, and its associated value, from the list of all search parameters.
   */
  delete(name: string): void;
  /**
   * Returns the first value associated to the given search parameter.
   */
  get(name: string): string | null;
  /**
   * Returns all the values association with a given search parameter.
   */
  getAll(name: string): string[];
  /**
   * Returns a Boolean indicating if such a search parameter exists.
   */
  has(name: string): boolean;
  /**
   * Sets the value associated to a given search parameter to the given value. If there were several values, delete the others.
   */
  set(name: string, value: string): void;
  sort(): void;
  /**
   * Returns a string containing a query string suitable for use in a URL. Does not include the question mark.
   */
  toString(): string;
  forEach(
    callbackfn: (value: string, key: string, parent: URLSearchParams) => void,
    thisArg?: any
  ): void;
}

export declare var URLSearchParams: {
  prototype: URLSearchParams;
  new (
    init?: string[][] | Record<string, string> | string | URLSearchParams
  ): URLSearchParams;
  toString(): string;
};
