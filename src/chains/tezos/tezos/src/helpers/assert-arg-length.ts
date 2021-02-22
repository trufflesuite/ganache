type UnknownFn = (this: unknown, ...args: any[]) => unknown;
type FunctionPropertyDescriptor<
  T extends UnknownFn
> = TypedPropertyDescriptor<T>;
// TODO : this can be common for all flavors
export function assertArgLength(min: number, max: number = min) {
  return function <O extends Object, T extends UnknownFn>(
    target: O,
    propertyKey: keyof O,
    descriptor: FunctionPropertyDescriptor<T>
  ) {
    const original = descriptor.value;
    descriptor.value = function (this: unknown) {
      const length = arguments.length;
      if (length < min || length > max) {
        throw new Error(
          `Incorrect number of arguments. '${propertyKey}' requires ${
            min === max
              ? `exactly ${min} ${min === 1 ? "argument" : "arguments"}.`
              : `between ${min} and ${max} arguments.`
          }`
        );
      }
      return Reflect.apply(original, this, arguments);
    } as T;
    return descriptor as FunctionPropertyDescriptor<T>;
  };
}
