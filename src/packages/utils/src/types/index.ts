export * from "./connector";
export * from "./provider";
export * from "./api";

export type RemoveIndex<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
    ? never
    : K]: T[K];
};

export type KnownKeys<T> = keyof RemoveIndex<T>;

declare global {
  interface JSON {
    parse(text: string | Buffer, reviver?: (key: any, value: any) => any): any;
  }
}

type Has4Overloads<T> = T extends {
  (...o: infer U): void;
  (...o: infer U2): void;
  (...o: infer U3): void;
  (...o: infer U4): void;
}
  ? unknown[] extends U
    ? []
    : true
  : false;
type Has3Overloads<T> = false extends Has4Overloads<T>
  ? T extends {
      (...o: infer U): void;
      (...o: infer U2): void;
      (...o: infer U3): void;
    }
    ? unknown[] extends U
      ? []
      : true
    : false
  : false;
type Has2Overloads<T> = false extends Has4Overloads<T>
  ? false extends Has3Overloads<T>
    ? T extends {
        (...o: infer U): void;
        (...o: infer U2): void;
      }
      ? unknown[] extends U
        ? []
        : true
      : false
    : false
  : false;
type Has1Overload<T> = false extends Has4Overloads<T>
  ? false extends Has3Overloads<T>
    ? false extends Has2Overloads<T>
      ? T extends {
          (...o: infer U): void;
        }
        ? unknown[] extends U
          ? []
          : true
        : false
      : false
    : false
  : false;

export type OverloadedParameters<T> = false extends Has1Overload<T>
  ? false extends Has2Overloads<T>
    ? false extends Has3Overloads<T>
      ? false extends Has4Overloads<T>
        ? []
        : T extends {
            (...o: infer U): void;
            (...o: infer U1): void;
            (...o: infer U2): void;
            (...o: infer U3): void;
          }
        ? U | U1 | U2 | U3
        : never
      : T extends {
          (...o: infer U): void;
          (...o: infer U1): void;
          (...o: infer U2): void;
        }
      ? U | U1 | U2
      : never
    : T extends {
        (...o: infer U): void;
        (...o: infer U1): void;
      }
    ? U | U1
    : never
  : T extends {
      (...o: infer U): void;
    }
  ? U
  : never;

type G<T extends (...args: unknown[]) => unknown> = OverloadedParameters<T>;
function b() {}
type a = G<typeof b>;
function g(t: ArrayLike<any>) {
  return 123;
}
g({} as a);
