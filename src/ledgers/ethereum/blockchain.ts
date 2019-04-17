import Database from "./database";
import Emittery from "emittery";
import BlockManager from "./things/block-manager";
import TransactionManager from "./things/transaction-manager";
import Trie from "merkle-patricia-tree";
import { BN } from "ethereumjs-util";
const VM = require("ethereumjs-vm");

export default class Blockchain extends Emittery {
    public blocks: BlockManager;
    public transactions: TransactionManager;
    public vm: any;
    public trie: Trie;

    constructor(hardfork: string, allowUnlimitedContractSize: boolean) {
        super();

        const db = new Database({});
        db.on("ready", () => {
            this.blocks = new BlockManager(db);
            this.transactions = new TransactionManager(db);

            const root:any = null;
            this.trie = new Trie(db.trie, root);

            this.vm = new VM({
                state: this.trie,
                activatePrecompiles: true,
                hardfork,
                allowUnlimitedContractSize,
                blockchain: {
                    getBlock: async (number: BN, done) => {
                        const hash = await this.blockNumberToHash(number);

                        hash(done);
                    }
                }
            });
            this.vm.on("step", this.emit.bind(this, "step"));

            this.emit("ready");
        });
    }

    blockNumberToHash(number: BN): Promise<Buffer> {
        number.toString();
    }
}

// BlockchainDouble.prototype.createVMFromStateTrie = function(state, activatePrecompiles) {
//     const self = this;
//     const vm = new VM({
//       state: state,
//       blockchain: {
//         // EthereumJS VM needs a blockchain object in order to get block information.
//         // When calling getBlock() it will pass a number that's of a Buffer type.
//         // Unfortunately, it uses a 64-character buffer (when converted to hex) to
//         // represent block numbers as well as block hashes. Since it's very unlikely
//         // any block number will get higher than the maximum safe Javascript integer,
//         // we can convert this buffer to a number ahead of time before calling our
//         // own getBlock(). If the conversion succeeds, we have a block number.
//         // If it doesn't, we have a block hash. (Note: Our implementation accepts both.)
//         getBlock: function(number, done) {
//           try {
//             number = to.number(number);
//           } catch (e) {
//             // Do nothing; must be a block hash.
//           }
  
//           self.getBlock(number, done);
//         }
//       },
//       activatePrecompiles: activatePrecompiles || false,
//       hardfork: self.options.hardfork,
//       allowUnlimitedContractSize: self.options.allowUnlimitedContractSize
//     });
  
//     if (self.options.debug === true) {
//       // log executed opcodes, including args as hex
//       vm.on("step", function(info) {
//         var name = info.opcode.name;
//         var argsNum = info.opcode.in;
//         if (argsNum) {
//           var args = info.stack
//             .slice(-argsNum)
//             .map((arg) => to.hex(arg))
//             .join(" ");
  
//           self.logger.log(`${name} ${args}`);
//         } else {
//           self.logger.log(name);
//         }
//       });
//     }
  
//     return vm;
//   };