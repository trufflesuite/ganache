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

// common.param("gasPrices", "eip1559Transition", 0xffffffffffff)
// //@ts-ignore
// const changes = common.HARDFORK_CHANGES as HardforkChanges;
// // iterate backwards, as shanghai was recent, and then remove the EIP from the
// // list of EIPs for the shanghai hardfork
// for (let i = changes.length - 1; i >= 0; i--) {
//   const [name, spec] = changes[i];
//   if (name !== hardfork) continue;

//   if (spec.eips) {
//     const newSpec = JSON.parse(JSON.stringify(spec)) as typeof spec;
//     // remove the EIP from the list of EIPs for the hardfork
//     // by splicing `eipToRemove` from the `newSpec.eips` array:
//     const index = newSpec.eips.indexOf(eipToRemove);
//     if (index !== -1) {
//       newSpec.eips.splice(index, 1);
//       changes[i][1] = newSpec;
//     }
//   }

//   // we found the hardfork, so we can stop iterating
//   break;
// }
//}
