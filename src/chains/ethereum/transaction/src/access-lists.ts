import {
  AccessList,
  AccessListBuffer,
  AccessListItem,
  isAccessList
} from "@ethereumjs/tx";
import Common from "@ethereumjs/common";
import { bufferToHex, setLengthLeft, toBuffer } from "ethereumjs-util";

export class AccessLists {
  public static getAccessListData(accessList: AccessListBuffer | AccessList) {
    let AccessListJSON;
    let bufferAccessList;
    if (accessList && isAccessList(accessList)) {
      AccessListJSON = accessList;
      const newAccessList: AccessListBuffer = [];

      for (let i = 0; i < accessList.length; i++) {
        const item: AccessListItem = accessList[i];
        const addressBuffer = toBuffer(item.address);
        const storageItems: Buffer[] = [];
        for (let index = 0; index < item.storageKeys.length; index++) {
          storageItems.push(toBuffer(item.storageKeys[index]));
        }
        newAccessList.push([addressBuffer, storageItems]);
      }
      bufferAccessList = newAccessList;
    } else {
      bufferAccessList = accessList ? accessList : [];
      // build the JSON
      const json: AccessList = [];
      for (let i = 0; i < bufferAccessList.length; i++) {
        const data = bufferAccessList[i];
        const address = bufferToHex(data[0]);
        const storageKeys: string[] = [];
        for (let item = 0; item < data[1].length; item++) {
          storageKeys.push(bufferToHex(data[1][item]));
        }
        const jsonItem: AccessListItem = {
          address,
          storageKeys
        };
        json.push(jsonItem);
      }
      AccessListJSON = json;
    }

    return {
      AccessListJSON,
      accessList: bufferAccessList
    };
  }

  public static getDataFeeEIP2930(
    accessList: AccessListBuffer,
    common: Common
  ): number {
    const accessListStorageKeyCost = common.param(
      "gasPrices",
      "accessListStorageKeyCost"
    );
    const accessListAddressCost = common.param(
      "gasPrices",
      "accessListAddressCost"
    );

    let slots = 0;
    for (let index = 0; index < accessList.length; index++) {
      const item = accessList[index];
      const storageSlots = item[1];
      slots += storageSlots.length;
    }

    const addresses = accessList.length;
    return addresses * accessListAddressCost + slots * accessListStorageKeyCost;
  }
}
