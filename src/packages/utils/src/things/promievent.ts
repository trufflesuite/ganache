import Emittery from "emittery";

// PromiEvent's `resolve and `reject` need to return a PromiEvent, not just a
// Promise
declare var Promise: {
  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): PromiEvent<TResult>;
  
  /**
   * Creates a new resolved promievent for the provided value.
   * @param value A promise.
   * @returns A promievent whose internal state matches the provided promise.
   */
  resolve<T>(value: T | PromiseLike<T>): PromiEvent<T>;

  /**
   * Creates a new resolved promievent.
   * @returns A resolved promievent.
   */
  resolve(): PromiEvent<void>;
} & PromiseConstructor;

class PromiEvent<T> extends Promise<T> {
  constructor (executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
    super(executor);
    this.init();
  }

  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected The callback to execute when the Promise is rejected.
   * @returns A PromiEvent for the completion of the callback.
   */
  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null) {
    const prom = new PromiEvent<T | TResult>((resolve, reject) => {
      this.onAny((eventName, eventData) => {
          return prom.emit(eventName, eventData);
      });
      const p = super.catch<TResult>(onrejected);
      p.then(resolve, reject);
    });
    return prom;
  }

  /**
   * Creates a new resolved promievent.
   * @returns A resolved promievent.
   */
  static resolve(): PromiEvent<void>;
  /**
   * Creates a new resolved promievent for the provided value.
   * @param value A promise.
   * @returns A promievent whose internal state matches the provided promise.
   */
  static resolve<T = never>(value: T | PromiseLike<T>): PromiEvent<T>;
  static resolve<T = never>(value?: T | PromiseLike<T>) {
    return new PromiEvent<T>(resolve => {
      resolve(value);
    });
  }

  /**
   * Used to immediately clear all event listeners on the instance and prevent
   * any additional binding or emission from the Emitter.
   * 
   * Once disposed no listeners can be bound to this emitter.
   * 
   * Note: `dispose` is pre-bound to the `this`, making it possible to pass the
   * method around detached from it's context.
   */
  public dispose = () => {
    this.clearListeners();

    // Ensure that once disposed no listeners can be bound to this emitter.
    this.anyEvent = this.events = this.bindMethods = this.once = this.on = this.onAny = () => {throw new Error("PromiEvent bound after dispose");};
  }
}

interface PromiEvent<T> extends Promise<T>, Emittery {
}

applyMixins(PromiEvent, [Emittery]);

export default PromiEvent;

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
      Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
          Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name)!);
      });
  });
}
