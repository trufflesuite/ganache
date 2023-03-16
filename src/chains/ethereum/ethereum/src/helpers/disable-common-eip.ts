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
        // remove the EIP from the list of EIPs for the hardfork
        const newEips = [];
        for (let i = 0, l = spec.eips.length; i < l; i++) {
          const eip = spec.eips[i];
          if (eip !== eipToRemove) newEips.push(eip);
        }
        spec.eips = newEips;
      }
      // we found the hardfork, so we can stop iterating
      break;
    }
  }
}
