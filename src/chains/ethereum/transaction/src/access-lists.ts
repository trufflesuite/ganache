import {
  AccessList,
  AccessListBuffer,
  AccessListItem,
  isAccessList
} from "@ethereumjs/tx";
export {
  AccessList,
  AccessListBuffer,
  AccessListItem,
  isAccessList
} from "@ethereumjs/tx";
import { Data } from "@ganache/utils";
import { Params } from "./params";

export class AccessLists {
  public static getAccessListData(accessList: AccessListBuffer | AccessList) {
    let AccessListJSON: AccessList;
    let bufferAccessList: AccessListBuffer;

    let slots: number = 0;
    const accessListStorageKeyCost = Params.ACCESS_LIST_STORAGE_KEY_GAS;
    const accessListAddressCost = Params.ACCESS_LIST_ADDRESS_GAS;
    if (accessList && isAccessList(accessList)) {
      AccessListJSON = accessList;
      const newAccessList: AccessListBuffer = [];

      for (let i = 0; i < accessList.length; i++) {
        const item: AccessListItem = accessList[i];
        const addressBuffer = Data.toBuffer(item.address, 32);
        const storageItems: Buffer[] = [];
        const storageKeysLength = item.storageKeys.length;
        slots += storageKeysLength;
        for (let index = 0; index < storageKeysLength; index++) {
          storageItems.push(Data.toBuffer(item.storageKeys[index]));
        }
        newAccessList.push([addressBuffer, storageItems]);
      }
      bufferAccessList = newAccessList;
    } else {
      bufferAccessList = accessList ? <AccessListBuffer>accessList : [];
      // build the JSON
      const json: AccessList = [];
      for (let i = 0; i < bufferAccessList.length; i++) {
        const data = bufferAccessList[i];
        const address = Data.toString(data[0], 32);
        const storageKeys: string[] = [];
        const storageKeysLength = data[1].length;
        slots += storageKeysLength;
        for (let item = 0; item < storageKeysLength; item++) {
          storageKeys.push(Data.toString(data[1][item], 32));
        }
        const jsonItem: AccessListItem = {
          address,
          storageKeys
        };
        json.push(jsonItem);
      }
      AccessListJSON = json;
    }
    const dataFee = BigInt(
      bufferAccessList.length * accessListAddressCost +
        slots * accessListStorageKeyCost
    );
    return {
      AccessListJSON,
      accessList: bufferAccessList,
      dataFeeEIP2930: dataFee
    };
  }
}
