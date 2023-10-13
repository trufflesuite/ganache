import type { Common } from "@ethereumjs/common";

export function changeCommonParamValue(
  common: Common,
  eip: number,
  topic: string,
  name: string,
  value: bigint
) {
  const original = common.paramByEIP.bind(common);
  common.paramByEIP = function (
    paramTopic: string,
    paramName: string,
    paramEip: number
  ) {
    if (paramTopic === topic && paramName === name && paramEip === eip) {
      return value;
    }
    return original.call(common, paramTopic, paramName, paramEip);
  };
}
