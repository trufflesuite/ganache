import { RpcTransaction } from "./rpc-transaction";
import type Common from "@ethereumjs/common";
import { RuntimeTransaction } from "./runtime-transaction";

/**
 * A FakeTransaction spoofs the from address and signature.
 */

export class FakeTransaction extends RuntimeTransaction {
  constructor(data: RpcTransaction, common: Common) {
    super(data, common);

    if (this.from == null) {
      throw new Error(
        "Internal Error: FakeTransaction initialized without a `from` field."
      );
    }
  }
}
