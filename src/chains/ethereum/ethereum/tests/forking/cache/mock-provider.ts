type Provider = {
  send: (payload: any, callback: any) => void;
};

import { Batch, Model } from "./arbitraries";

export const mockProvider = (options: {
  model: Model;
  batch: Batch;
}): Provider => {
  const { model, batch } = options;

  const { networkId, getBlockByNumber } = model.networks[batch.descendantIndex];

  return {
    send(payload, callback) {
      const { jsonrpc, id, method, params } = payload;

      switch (method) {
        case "eth_getBlockByNumber": {
          let [blockNumber] = params;
          if (blockNumber === "earliest") {
            blockNumber = 0;
          }

          const height = parseInt(blockNumber);

          (getBlockByNumber(height) as any).then(block => {
            const result = block
              ? {
                  number: `0x${height.toString(16)}`,
                  hash: block.hash
                }
              : undefined;

            return callback(null, {
              jsonrpc,
              id,
              result
            });
          });
        }
        case "net_version": {
          const result = networkId;

          return callback(null, {
            jsonrpc,
            id,
            result
          });
        }
      }
    }
  };
};
