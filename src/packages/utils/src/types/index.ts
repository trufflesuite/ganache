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

// type Has4Overloads<T> = T extends {
//   (...o: infer U): void;
//   (...o: infer U2): void;
//   (...o: infer U3): void;
//   (...o: infer U4): void;
// }
//   ? unknown[] extends U
//     ? []
//     : true
//   : false;
// type Has3Overloads<T> = false extends Has4Overloads<T>
//   ? T extends {
//       (...o: infer U): void;
//       (...o: infer U2): void;
//       (...o: infer U3): void;
//     }
//     ? unknown[] extends U
//       ? []
//       : true
//     : false
//   : false;
// type Has2Overloads<T> = false extends Has4Overloads<T>
//   ? false extends Has3Overloads<T>
//     ? T extends {
//         (...o: infer U): void;
//         (...o: infer U2): void;
//       }
//       ? unknown[] extends U
//         ? []
//         : true
//       : false
//     : false
//   : false;
// type Has1Overload<T> = false extends Has4Overloads<T>
//   ? false extends Has3Overloads<T>
//     ? false extends Has2Overloads<T>
//       ? T extends {
//           (...o: infer U): void;
//         }
//         ? unknown[] extends U
//           ? []
//           : true
//         : false
//       : false
//     : false
//   : false;

// export type OverloadedParameters<T> = false extends Has1Overload<T>
//   ? false extends Has2Overloads<T>
//     ? false extends Has3Overloads<T>
//       ? false extends Has4Overloads<T>
//         ? []
//         : T extends {
//             (...o: infer U): void;
//             (...o: infer U1): void;
//             (...o: infer U2): void;
//             (...o: infer U3): void;
//           }
//         ? U | U1 | U2 | U3
//         : never
//       : T extends {
//           (...o: infer U): void;
//           (...o: infer U1): void;
//           (...o: infer U2): void;
//         }
//       ? U | U1 | U2
//       : never
//     : T extends {
//         (...o: infer U): void;
//         (...o: infer U1): void;
//       }
//     ? U | U1
//     : never
//   : T extends {
//       (...o: infer U): void;
//     }
//   ? U
//   : never;

type Overloads<T extends (...args: any[]) => any> = T extends {
  (...args: infer A1): infer R1;
  (...args: infer A2): infer R2;
  (...args: infer A3): infer R3;
  (...args: infer A4): infer R4;
  (...args: infer A5): infer R5;
  (...args: infer A6): infer R6;
}
  ?
      | ((...args: A1) => R1)
      | ((...args: A2) => R2)
      | ((...args: A3) => R3)
      | ((...args: A4) => R4)
      | ((...args: A5) => R5)
      | ((...args: A6) => R6)
  : T extends {
      (...args: infer A1): infer R1;
      (...args: infer A2): infer R2;
      (...args: infer A3): infer R3;
      (...args: infer A4): infer R4;
      (...args: infer A5): infer R5;
    }
  ?
      | ((...args: A1) => R1)
      | ((...args: A2) => R2)
      | ((...args: A3) => R3)
      | ((...args: A4) => R4)
      | ((...args: A5) => R5)
  : T extends {
      (...args: infer A1): infer R1;
      (...args: infer A2): infer R2;
      (...args: infer A3): infer R3;
      (...args: infer A4): infer R4;
    }
  ?
      | ((...args: A1) => R1)
      | ((...args: A2) => R2)
      | ((...args: A3) => R3)
      | ((...args: A4) => R4)
  : T extends {
      (...args: infer A1): infer R1;
      (...args: infer A2): infer R2;
      (...args: infer A3): infer R3;
    }
  ? ((...args: A1) => R1) | ((...args: A2) => R2) | ((...args: A3) => R3)
  : T extends { (...args: infer A1): infer R1; (...args: infer A2): infer R2 }
  ? ((...args: A1) => R1) | ((...args: A2) => R2)
  : T extends { (...args: infer A1): infer R1 }
  ? (...args: A1) => R1
  : never;

// the OverloadedParameters type adds `unknown[]` and it shouldn't, so we remove it here:
type NoUnknownArray<T> = T extends infer I
  ? unknown[] extends I
    ? never
    : I
  : T;

// from: https://github.com/microsoft/TypeScript/issues/32164#issuecomment-811608386
export type OverloadedParameters<T extends (...args: any[]) => any> =
  NoUnknownArray<Parameters<Overloads<T>>>;
