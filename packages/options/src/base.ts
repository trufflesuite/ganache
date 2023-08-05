import { NoUnion } from "./types";
type PrimitiveCliTypes = string | number | boolean;
export type CliTypes =
  | PrimitiveCliTypes
  | PrimitiveCliTypes[]
  | string[]
  | number[]
  | boolean[];

export type CliTypeMap<T> = T extends string
  ? "string"
  : T extends number
  ? "number"
  : T extends boolean
  ? "boolean"
  : T extends NoUnion<infer I>[]
  ? I extends PrimitiveCliTypes
    ? `array:${CliTypeMap<I>}`
    : never
  : T extends any[]
  ? "array"
  : never;

export type YargsPrimitiveCliTypeStrings =
  | CliTypeMap<PrimitiveCliTypes>
  | "array";

export namespace Base {
  export type Option = {
    rawType?: unknown;
    type: unknown;
    hasDefault?: true;
    legacy?: {
      [name: string]: unknown;
    };
    cliType?: CliTypes;
  };

  export type ExclusiveGroupOptionName = string;
  export type ExclusiveGroup = ExclusiveGroupOptionName[];

  export type Config = {
    options: {
      [optionName: string]: Option;
    };

    exclusiveGroups?: ExclusiveGroup[];
  };
}
