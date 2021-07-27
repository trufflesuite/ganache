import { TypedRpcTransaction } from "./rpc-transaction";
import type Common from "@ethereumjs/common";
import { RuntimeTransaction } from "./runtime-transaction";

/**
 * A FakeTransaction spoofs the from address and signature.
 */

export class FakeTransaction {
  constructor(data: TypedRpcTransaction, common: Common) {
    //super(data, common);

    //if (this.from == null) {
    throw new Error(
      "Internal Error: FakeTransaction initialized without a `from` field."
    );
    //}
  }

  public toJSON = () => {
    return;
  };
}
