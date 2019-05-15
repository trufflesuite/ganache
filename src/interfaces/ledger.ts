export type Emitter = {
    on(eventName: string, listener: (eventData?: any) => any): any
    off(eventName: string, listener: (eventData?: any) => any): any
    emit(eventName: string, eventData?: any): any
};

/**
 * Defines the interface for a Ledger.
 * all properties must be `async` callable or return a `Promise`
 */
export default interface ILedger {
    readonly [key: string]: (params?: any[]) => Promise<any>;
}
