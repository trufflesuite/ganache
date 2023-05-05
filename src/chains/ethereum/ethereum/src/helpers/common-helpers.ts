import type { Common } from "@ethereumjs/common";

/**
 * Effectively removes the 3860 InitCode Size Limit check by increasing the init
 * code size to Number.MAX_SAFE_INTEGER.
 *
 * This number works because an initcode can practically never be that large
 * (approx 9 PetaBytes!).
 *
 * @param common
 * @returns
 */
export function removeEIP3860InitCodeSizeLimitCheck(common: Common) {
  // this is a hack until EJS ships `allowUnlimitedInitCodeSize` option https://github.com/ethereumjs/ethereumjs-monorepo/issues/2588
  return changeCommonParamValue(
    common,
    3860,
    "vm",
    "maxInitCodeSize",
    // we'd use Infinity if we could, but that's not a valid BigInt
    BigInt(Number.MAX_SAFE_INTEGER)
  );
}

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
