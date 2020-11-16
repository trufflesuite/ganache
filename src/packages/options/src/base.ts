export namespace Base {
  export type Option = {
    rawType?: unknown;
    type: unknown;
    hasDefault?: true;
    legacy?: {
      [name: string]: unknown;
    };
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
