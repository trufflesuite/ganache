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
import { Address } from "@ganache/ethereum-address";
import { Params } from "./params";

const STORAGE_KEY_LENGTH = 32;

/*
  As per https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2930.md

  AccessLists must be in the form of:
  [[{20 bytes}, [{32 bytes}...]]...]
  where ... implies "zero or more of the thing to the left"
*/
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
        const addressBuffer = Address.toBuffer(item.address);
        const storageItems: Buffer[] = [];
        const storageKeysLength = item.storageKeys.length;
        slots += storageKeysLength;
        for (let index = 0; index < storageKeysLength; index++) {
          storageItems.push(
            Data.toBuffer(item.storageKeys[index], STORAGE_KEY_LENGTH)
          );
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
        const address = Address.toString(data[0]);
        const storageKeys: string[] = [];
        const storageKeysLength = data[1].length;
        slots += storageKeysLength;
        for (let item = 0; item < storageKeysLength; item++) {
          storageKeys.push(Data.toString(data[1][item], STORAGE_KEY_LENGTH));
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

  public static isValidAccessList(accessList: AccessList): boolean {
    if (!Array.isArray(accessList)) {
      // an access list must be an array
      return false;
    }
    for (const accessListItem of accessList) {
      Object.keys(accessListItem).forEach(key => {
        if (key !== "address" && key !== "storageKeys") {
          // an access list item can only contain the "address" and
          // "storageKeys" props
          return false;
        }
      });
      const { address, storageKeys } = accessListItem;
      if (address.length != 42) {
        // each address must be 20 bytes (plus "0x" in string version)
        return false;
      }
      for (
        let storageSlot = 0;
        storageSlot < storageKeys.length;
        storageSlot++
      ) {
        if (storageKeys[storageSlot].length != 66) {
          // each storageKey must be 32 byes (plus "0x" in string version)
          return false;
        }
      }
    }
    return true;
  }
}
