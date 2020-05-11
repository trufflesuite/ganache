import Emittery from "emittery";

class PromiEvent<T> extends Promise<T>{
  constructor (executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
    super(executor);
    this.init();
  }
}

interface PromiEvent<T> extends Promise<T>, Emittery {}
applyMixins(PromiEvent, [Promise, Emittery]);

export default PromiEvent;

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
      Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
          Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name)!);
      });
  });
}
