export type Emitter = {
  on(eventName: string, listener: (eventData?: any) => any): any;
  off(eventName: string, listener: (eventData?: any) => any): any;
  emit(eventName: string, eventData?: any): any;
};

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
export default interface Api extends ApiBase {}
