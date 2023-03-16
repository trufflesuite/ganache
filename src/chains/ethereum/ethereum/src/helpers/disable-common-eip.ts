import type { Common } from "@ethereumjs/common";
import type { hardforks as HARDFORK_SPECS } from "@ethereumjs/common/dist/hardforks";

type HardforkSpecKeys = keyof typeof HARDFORK_SPECS;
type HardforkChanges = [name: HardforkSpecKeys, spec: { eips?: number[] }][];

export function disableCommonEip(
  common: Common,
  hardfork: HardforkSpecKeys,
  eipToRemove: number
) {
  //@ts-ignore
  const changes = common.HARDFORK_CHANGES as HardforkChanges;
  // iterate backwards, as shanghai was recent, and then remove the EIP from the
  // list of EIPs for the shanghai hardfork
  for (let i = changes.length - 1; i >= 0; i--) {
    const [name, spec] = changes[i];
    if (name === hardfork) {
      if (spec.eips) {
        const newSpec = JSON.parse(JSON.stringify(spec)) as typeof spec;
        // remove the EIP from the list of EIPs for the hardfork
        // by splicing `eipToRemove` from the `newSpec.eips` array:
        const index = newSpec.eips.indexOf(eipToRemove);
        if (index !== -1) {
          newSpec.eips.splice(index, 1);
        }

        changes[i][1] = newSpec;
      }
      // we found the hardfork, so we can stop iterating
      break;
    }
  }
}
