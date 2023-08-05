import Emittery from "emittery";

// PromiEvent's `resolve and `reject` need to return a PromiEvent, not just a
// Promise
declare var Promise: {
  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected - The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): PromiEvent<TResult>;

  /**
   * Creates a new resolved promievent for the provided value.
   * @param value - A promise.
   * @returns A promievent whose internal state matches the provided promise.
   */
  resolve<T>(value: T | PromiseLike<T>): PromiEvent<T>;

  /**
   * Creates a new resolved promievent.
   * @returns A resolved promievent.
   */
  resolve(): PromiEvent<void>;
} & PromiseConstructor;

const emitteryMethods = [
  "clearListeners",
  "once",
  "on",
  "emit",
  "onAny"
] as const;

// A hack to fix Emittery's `mixin` type.
// issue: https://github.com/sindresorhus/emittery/issues/79
const mixin = Emittery.mixin.bind(Emittery) as (
  emitteryPropertyName: string | symbol,
  methodNames?: readonly string[]
) => <T extends { new (...args: any): any }>(klass: T) => T;

@mixin(Symbol.for("emittery"), emitteryMethods)
class PromiEvent<T> extends Promise<T> {
  constructor(
    executor: (
      resolve: (value?: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void
  ) {
    super(executor);
  }

  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected - The callback to execute when the Promise is rejected.
   * @returns A PromiEvent for the completion of the callback.
   */
  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ) {
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
   * @param value - A promise.
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
    if (!this.clearListeners) throw new Error("PromiEvent already disposed");

    this.clearListeners();

    // Ensure that once disposed no listeners can be bound to this emitter.
    const fn = () => {
      throw new Error("PromiEvent bound after dispose");
    };
    emitteryMethods
      .filter(m => m !== "emit")
      .forEach(methodName => {
        Object.defineProperty(this, methodName, {
          enumerable: false,
          value: fn
        });
      });
  };
}

interface PromiEvent<T>
  extends Promise<T>,
    Pick<Emittery, typeof emitteryMethods[number]> {
  emittery: Emittery;
}

export default PromiEvent;
