/**
 * Base implementation for an API.
 * All properties must be `async` callable or return a `Promise`
 */
class ApiBase {
  readonly [index: string]: (...args: any) => Promise<any>;
}

/**
 * Defines the interface for a API.
 * All properties must be `async` callable or return a `Promise`
 */
export interface Api extends ApiBase {}
