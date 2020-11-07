export namespace Base {
  export type Option = {
    rawType?: any;
    type: any;
    hasDefault?: true;
    legacy?: {
      [k: string]: any;
    };
  };

  export type ExclusiveGroupOptionName = string;
  export type ExclusiveGroup = ExclusiveGroupOptionName[];

  export type Config = {
    options: {
      [optionName: string]: Option;
    };

    exclusiveGroups: ExclusiveGroup[];
  };
}
