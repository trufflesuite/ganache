import { Interpreter } from "@ethereumjs/evm/dist/interpreter";

let patched = false;
const original = Interpreter.prototype.runStep;
export function patchInterpreterRunStep(
  interceptor: (interpreter: Interpreter) => Promise<void>
) {
  if (patched) throw new Error("don't patch me twice! that'll cause trouble"); // todo: allow patching multiple times
  Interpreter.prototype.runStep = function () {
    interceptor(this);
    return original.call(this);
  };
  patched = true;
}
export function unpatchInterpreterRunStep() {
  Interpreter.prototype.runStep = original;
  patched = false;
}
