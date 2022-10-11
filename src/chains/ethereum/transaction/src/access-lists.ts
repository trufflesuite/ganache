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

  /**
   * Creates a valid access list from a potentially invalid access list. Throws
   * for invalid JSON-RPC data for any of the `address` values or entries of the
   * `storageKeys` array.
   * @param accessList
   * @returns a valid access list that
   *  1. Is an array
   *  2. Each array element contains an object with the keys `address` and
   *     `storageKeys`.
   *  3. A value for the `address` key is not omitted.
   *  4. The value for the `address` key is a 20-byte, hex-encoded string.
   *  5. The `storageKeys` entry is an array.
   *  6. Each entry of the `storageKeys` array is a 32-byte, hex-encoded string.
   */
  public static tryGetValidatedAccessList(accessList: AccessList): AccessList {
    const validAccessList: AccessList = [];
    if (!Array.isArray(accessList)) {
      return validAccessList;
    }
    for (const accessListItem of accessList) {
      const { address, storageKeys } = accessListItem;
      if (!address) continue;

      const validStorageKeys: string[] = [];
      const validAccessListItem: AccessListItem = {
        address: Address.from(address).toString(),
        storageKeys: validStorageKeys
      };
      validAccessList.push(validAccessListItem);
      if (!Array.isArray(storageKeys)) continue;
      for (let i = 0; i < storageKeys.length; i++) {
        const storageKey = storageKeys[i];
        if (!storageKey) continue;
        validStorageKeys.push(
          Data.from(storageKey, STORAGE_KEY_LENGTH).toString()
        );
      }
    }
    return validAccessList;
  }
  /**
   * Compares two access lists to check if they are the same, both in content
   * and the order of the content.
   * @param a An access list to compare.
   * @param b An access list to compare.
   * @returns Boolean indicating if the two access lists are the same.
   */
  public static areAccessListsSame(a: AccessList, b: AccessList) {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      const alItemA = a[i];
      const alItemB = b[i];
      if (alItemA.address !== alItemB.address) {
        return false;
      }

      const aKeys = alItemA.storageKeys;
      const bKeys = alItemB.storageKeys;
      if (aKeys.length !== bKeys.length) {
        return false;
      }
      for (let j = 0; j < aKeys.length; j++) {
        if (aKeys[j] !== bKeys[j]) {
          return false;
        }
      }
    }
    return true;
  }
}
