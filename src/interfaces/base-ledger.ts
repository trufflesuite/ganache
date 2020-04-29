export type Emitter = {
  on(eventName: string, listener: (eventData?: any) => any): any;
  off(eventName: string, listener: (eventData?: any) => any): any;
  emit(eventName: string, eventData?: any): any;
};

/**
 * Base implementation for a Ledger.
 * All properties must be `async` callable or return a `Promise`
 */
export default class BaseLedger {
  readonly [index: string]: (...args: any) => Promise<any>;
}

/**
 * Defines the interface for a Ledger.
 * All properties must be `async` callable or return a `Promise`
 */
export interface ILedger extends BaseLedger {}
