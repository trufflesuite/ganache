import assert from "assert";
import { AccessList, AccessListItem, AccessLists } from "../";
describe("@ganache/ethereum-transaction", async () => {
  describe("access lists", () => {
    const address = "0x0000000000000000000000000000000000000001";
    const storageKey =
      "0x0000000000000000000000000000000000000000000000000000000000000001";
    const validAccessListItem: AccessListItem = {
      address,
      storageKeys: [storageKey]
    };
    const validAccessList: AccessList = [validAccessListItem];

    describe("tryGetValidatedAccessList", () => {
      it("returns empty array for non-array input", () => {
        const invalidList = null as any;
        const list = AccessLists.tryGetValidatedAccessList(invalidList);
        assert.deepStrictEqual(
          list,
          [],
          "expected empty array for non-array input"
        );
      });

      it("skips array entries without an address property", () => {
        const invalidList: AccessList = [
          validAccessListItem,
          { notAddress: "", storageKeys: [] }
        ] as any;
        const list = AccessLists.tryGetValidatedAccessList(invalidList);
        assert.deepStrictEqual(
          list,
          validAccessList,
          "expected array entries without an address property to be skipped"
        );
      });

      it("pads addresses to correct byte length", () => {
        const listToPad: AccessList = [
          { address: "0x1", storageKeys: [storageKey] }
        ];
        const list = AccessLists.tryGetValidatedAccessList(listToPad);
        assert.deepStrictEqual(
          list,
          validAccessList,
          "expected address to be padded to correct byte length"
        );
      });

      it("returns empty array for non-array input of `storageKeys`", () => {
        const invalidList: AccessList = [
          { address, storageKeys: "not-array" }
        ] as any;
        const list = AccessLists.tryGetValidatedAccessList(invalidList);
        assert.deepStrictEqual(
          list,
          [{ address, storageKeys: [] }],
          "expected non-array `storageKeys` to be replaced with an array"
        );
      });

      it("skips nullish `storageKeys` entries", () => {
        const invalidList: AccessList = [
          { address, storageKeys: [null, storageKey, undefined] }
        ] as any;
        const list = AccessLists.tryGetValidatedAccessList(invalidList);
        assert.deepStrictEqual(
          list,
          validAccessList,
          "expected nullish storage key entries to be skipped"
        );
      });

      it("pads storage keys to correct byte length", () => {
        const listToPad: AccessList = [{ address, storageKeys: ["0x1"] }];
        const list = AccessLists.tryGetValidatedAccessList(listToPad);
        assert.deepStrictEqual(
          list,
          validAccessList,
          "expected storage key to be padded to correct byte length"
        );
      });

      it("throws on invalid JSON-RPC data for `address` property", async () => {
        const invalidList: AccessList = [
          { address: "1", storageKeys: [storageKey] }
        ];
        assert.throws(
          () => {
            return AccessLists.tryGetValidatedAccessList(invalidList);
          },
          new Error(
            `Cannot wrap string value "1" as a json-rpc type; strings must be prefixed with "0x".`
          ),
          "missing expected rejection for invalid JSON-RPC data"
        );
      });

      it("throws on invalid JSON-RPC data for `storageKey` entry", async () => {
        const invalidList: AccessList = [{ address, storageKeys: ["1"] }];
        assert.throws(
          () => {
            return AccessLists.tryGetValidatedAccessList(invalidList);
          },
          new Error(
            `Cannot wrap string value "1" as a json-rpc type; strings must be prefixed with "0x".`
          ),
          "missing expected rejection for invalid JSON-RPC data"
        );
      });
    });

    describe("areAccessListsSame", () => {
      const address2 = "0x0000000000000000000000000000000000000002";
      const storageKey2 =
        "0x0000000000000000000000000000000000000000000000000000000000000002";
      it("access lists of differing lengths are not the same", () => {
        const list1: AccessList = [];
        const list2: AccessList = validAccessList;
        const areSame = AccessLists.areAccessListsSame(list1, list2);
        assert(
          !areSame,
          "access lists of differing length should not be equal"
        );
      });

      it("access lists of differing orders are not the same", () => {
        const anotherValidItem = {
          address: address2,
          storageKeys: [storageKey2]
        };
        const list1: AccessList = [validAccessListItem, anotherValidItem];
        const list2: AccessList = [anotherValidItem, validAccessListItem];
        const areSame = AccessLists.areAccessListsSame(list1, list2);
        assert(!areSame, "access lists of differing order should not be equal");
      });

      it("access lists with `storageKeys` of differing lengths are not the same", () => {
        const list1: AccessList = [
          {
            address,
            storageKeys: [storageKey, storageKey2]
          }
        ];
        const list2: AccessList = validAccessList;
        const areSame = AccessLists.areAccessListsSame(list1, list2);
        assert(
          !areSame,
          "access lists with `storageKeys` of differing length should not be equal"
        );
      });

      it("access lists with `storageKeys` of differing orders are not the same", () => {
        const list1: AccessList = [
          {
            address,
            storageKeys: [storageKey, storageKey2]
          }
        ];
        const list2: AccessList = [
          {
            address,
            storageKeys: [storageKey2, storageKey]
          }
        ];
        const areSame = AccessLists.areAccessListsSame(list1, list2);
        assert(
          !areSame,
          "access lists with `storageKeys` of differing order should not be equal"
        );
      });

      it("identical access lists are the same", () => {
        const list1 = [
          ...validAccessList,
          { address: address2, storageKeys: [storageKey2] }
        ];
        const list2 = [
          ...validAccessList,
          { address: address2, storageKeys: [storageKey2] }
        ];
        const areSame = AccessLists.areAccessListsSame(list1, list2);
        assert(areSame, "identical access lists should be the same");
      });
    });
  });
});
