import * as fc from "fast-check";

export interface Network {
  networkId: number;
  getBlockByNumber?(height: number): any;
  historicBlock: {
    number: number;
    hash: string;
  };
}

export class Model {
  private byDescendantIndexThenHeight: Network[][] = [];

  extendNetwork(descendantIndex: number, hash: string) {
    const networks = this.byDescendantIndexThenHeight[descendantIndex];

    const [latest] = networks.slice(-1);

    networks.push({
      ...latest,
      historicBlock: {
        number: latest.historicBlock.number + 1,
        hash
      }
    });
  }

  addNetwork(network: Network) {
    this.byDescendantIndexThenHeight.push([network]);
  }

  forkNetwork(descendantIndex: number, leftHash: string, rightHash: string) {
    const networks = this.byDescendantIndexThenHeight[descendantIndex];

    const [latest] = networks.slice(-1);

    this.byDescendantIndexThenHeight.push([
      ...networks,
      {
        ...latest,
        historicBlock: {
          number: latest.historicBlock.number + 1,
          hash: rightHash
        }
      }
    ]);

    networks.push({
      ...latest,
      historicBlock: {
        number: latest.historicBlock.number + 1,
        hash: leftHash
      }
    });
  }

  get networks() {
    return this.byDescendantIndexThenHeight.map(networks => {
      const [latest] = networks.slice(-1);
      return {
        ...latest,
        getBlockByNumber: (height: number | "earliest") =>
          (height === "earliest" ? networks[0] : networks[height] || {})
            .historicBlock
      };
    });
  }
}

const Hash = (): fc.Arbitrary<string> =>
  fc
    .hexaString({
      minLength: 64,
      maxLength: 64
    })
    .map(hash => `0x${hash}`);

const NetworkId = (): fc.Arbitrary<number> => fc.integer({ min: 1 });

namespace Commands {
  type Command = (model: Model) => void;

  export const AddNetwork = (): fc.Arbitrary<Command> =>
    fc.tuple(Hash(), NetworkId()).map(([hash, networkId]) => (model: Model) => {
      model.addNetwork({
        networkId,
        historicBlock: {
          number: 0,
          hash
        }
      });
    });

  export const ExtendNetwork = (): fc.Arbitrary<Command> =>
    fc.tuple(fc.nat(), Hash()).map(([num, hash]) => (model: Model) => {
      const descendantIndex = num % model.networks.length;
      model.extendNetwork(descendantIndex, hash);
    });

  export const ForkNetwork = (): fc.Arbitrary<Command> =>
    fc
      .tuple(fc.nat(), Hash(), Hash())
      .map(([num, leftHash, rightHash]) => (model: Model) => {
        const descendantIndex = num % model.networks.length;
        model.forkNetwork(descendantIndex, leftHash, rightHash);
      });
}

export const Networks = (): fc.Arbitrary<Model> =>
  fc
    .tuple(
      Commands.AddNetwork(),
      fc.array(
        fc.oneof(
          {
            arbitrary: Commands.AddNetwork(),
            weight: 1
          },
          {
            arbitrary: Commands.ExtendNetwork(),
            weight: 3
          },
          {
            arbitrary: Commands.ForkNetwork(),
            weight: 1
          }
        ),
        { maxLength: 100 }
      )
    )
    .map(([addNetwork, commands]) => {
      const model = new Model();

      addNetwork(model);

      for (const command of commands) {
        command(model);
      }

      return model;
    });

export interface Batch {
  descendantIndex: number;
  input: Network;
}

export const Batch = (model: Model): fc.Arbitrary<Batch> => {
  const { networks } = model;

  return fc
    .nat({
      max: networks.length * 1000
    })
    .chain(num => {
      const descendantIndex = num % model.networks.length;
      const network = networks[descendantIndex];
      const maxHeight = network.historicBlock.number;

      return fc.record({
        descendantIndex: fc.constant(descendantIndex),
        input: fc.nat({ max: maxHeight }).map(height => ({
          networkId: network.networkId,
          historicBlock: network.getBlockByNumber(height)
        }))
      });
    });
};

export const Batches = (model: Model): fc.Arbitrary<Batch[]> =>
  fc.array(Batch(model), { maxLength: 10 });
