import { Common } from "@ethereumjs/common";

export function disableCommonEip(common: Common, eip: number) {
  const eips = common.eips();
  const index = eips.indexOf(eip);
  if (index !== -1) {
    eips.splice(index, 1);
  }
}
