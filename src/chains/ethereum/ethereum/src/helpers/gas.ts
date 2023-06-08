import type { InterpreterStep } from "@ethereumjs/evm/";
import { VM } from "@ethereumjs/vm";

// gas exactimation:
// There are opcodes, the CALLs and CREATE (CREATE2? i dunno) that must
// "withhold" 1/64th of gasLeft from the gasLimit of these internal CALL/CREATE.
// The withheld gas is not used, it is just not available to any opcodes in the
// same depth, or deeper, than the CALL/CREATE that withheld the gas.
// The withholding computation is done _after_ the cost of the CALL/CREATE is
// subtracted from gasLeft.

// example:
// CODE  GASLEFT  GASLIMIT  COST  DEPTH   1/64
// -------------------------------------------
// CALL     1000      1000   100      0     14
// PUSH      900       886     3      1      0
// RETURN    897       883     0      1      0
// PUSH      897       897     3      0      0
// STOP      894       894     0      0      0
//
// GAS SPENT: 106
// CALL      106       106    100      0     1
// PUSH        6         5      3      1     0
// RETURN      3         2      0      1     0
// PUSH        3         3      3      0     0
// STOP        0         0      0      0     0

// example 2:
// CODE  GASLEFT  GASLIMIT  COST  DEPTH   1/64
// -------------------------------------------
// CALL     1000      1000   100      0     14
// PUSH      900       886     3      1      0
// PUSH      897       883     3      1      0
// RETURN    894       880     0      1      0
// STOP      894       894     0      0      0
//
// GAS SPENT: 106
// CALL      106       106    100      0     1
// PUSH        6         5      3      1     0
// PUSH        3         2      3      1     0 // <-- fails because this actually needs 1 additional gas
// RETURN      0        -1      0      1     0
// STOP        0         0      0      0     0
//
// An algorithm to compute the neccessary gas needs to:
// 1. find the deepest CALL/CREATE depth (if multiple are at the same depth, it doesn't matter which one is used first)
// 2. compute the gas cost, including dynamic costs, of all opcodes within that depth
//   2a. this is the minimum gasLimit needed at this depth to execute the code within it.
// 3. move up to the next highest depth, and repeat step 2, adding in the previous step 2's total gas cost
// 4. continue until all the things have been computed
//
// Caveats:
// * if SSTORE is called and `gas_left <= 2300` it would fail, even though SSTORE doesn't cost 2300 gas.
//   (see https://github.com/wolflo/evm-opcodes/blob/main/gas.md#a7-sstore). So we need to account for that.

//                   example call tree
// -------------------------------------------------------------------------------
//                      [root]                                                   //
//                /         |           \                                        //
//           [call         push          call]                                   // depth 0
//             |                           |                                     //
//       [call   ret]      [push   add   call     sub       call       ret]      // depth 1
//         |                               |                 |                   //
// [push   add   ret]                [push   add   ret]    [push   add   ret]    // depth 2
// -------------------------------------------------------------------------------

// Iterate over the call tree, starting at the last and deepest set of children (children groups are demarked by `[]`).
// Each child has one parent, and 0 or more children.
// In the example there are 3 children at depth 0, two of these children (the `call`s) also have children. These children
// are both at depth 1 (and so on).
// The algorithm is to start at the deepest children, and compute the gas cost of all the opcodes within that depth.
// Then move up to the next highest depth, and repeat, adding in the previous depth's total gas cost + the 1/64th
// required gas that EIP-150 requires in order to go to a deeper depth.

type Node = {
  name: string; // `name` is required for distinguishing SSTORE opcodes for special rules
  cost: bigint;
  minimum?: bigint; // the minimum gas left required for the opcode to execute (if different to `cost`)
  children: Node[];
  parent: Node | null;
};

function computeGas({ cost, minimum, children }: Node) {
  if (children.length === 0) {
    return {
      cost,
      required: minimum || cost
    };
  } else {
    let totalRequired = 0n;
    let totalCost = 0n;
    for (const child of children) {
      const { required, cost: subCost } = computeGas(child);
      // totalRequired = Math.max(totalCost + required, totalRequired), but bigints, so 🤷

      totalRequired =
        totalCost + required > totalRequired
          ? totalCost + required
          : totalRequired;
      // we need to carry the _actual_ cost forward, as that is what we spend
      totalCost += subCost;
    }
    const sixtyFloorths = (totalRequired * 64n) / 63n;
    return {
      cost: totalCost + cost,
      required: sixtyFloorths + (minimum || cost)
    };
  }
}

export class GasTracer {
  root: Node;
  node: Node;
  depth: number;
  constructor(private readonly vm: VM) {
    this.reset();
  }

  install() {
    this.vm.evm.events.on("step", this.onStep.bind(this));
  }

  uninstall() {
    this.vm.evm.events.off("step", this.onStep.bind(this));
  }

  reset() {
    this.node = this.root = {
      name: "root",
      cost: 0n,
      parent: null,
      children: []
    };
    this.depth = 0;
  }

  onStep({ opcode, depth }: InterpreterStep) {
    const { node } = this;
    const fee = opcode.dynamicFee || BigInt(opcode.fee);
    if (depth === this.depth) {
      // the previous opcode didn't change the depth, so we can roll this
      // opcode's cost up into it's parent's last child's costs.
      // rolling up avoids having to iteratate over all children again.

      let previousSibling: Node;

      if (
        opcode.name === "SSTORE" ||
        (previousSibling = node.children[node.children.length - 1]) ===
          undefined ||
        previousSibling.name === "SSTORE"
      ) {
        // the current opcode is SSTORE, or there is no previous sibling, or the
        // previous sibling's opcode is "SSTORE" we need a new node
        const newNode = (node.children[node.children.length] = {
          name: opcode.name,
          cost: fee,
          parent: this.node,
          children: []
        } as Node);
        if (newNode.name === "SSTORE") {
          // SSTORE will revert if `gas_left <= 2300` (even though it can
          // cost less - it's complicated). See
          // https://github.com/wolflo/evm-opcodes/blob/main/gas.md#a7-sstore
          newNode.minimum = 2301n;
        }
      } else {
        // otherwise, we can amend the previous sibling
        previousSibling.cost += fee;

        previousSibling.name = `...${opcode.name}`;
      }
      return;
    }

    if (depth > this.depth) {
      // The previous operation was a depth increasing OP (CALL, CREATE, etc)
      // We know this because the depth has increased.
      // So, we need to update our parent to be the last child of the current parent
      this.node = node.children[node.children.length - 1];
      this.depth = depth;
    } else {
      // depth < this.depth
      // The previous operation was a depth decreasing OP (STOP, INVALID, etc)
      // This means the `this.node` will have no more children added to it.

      // Now we jump up to the current `node`'s parent
      this.node = node.parent;
      this.depth = depth;
    }

    const op: Node = {
      name: `${opcode.name}...`,
      cost: fee,
      parent: this.node,
      children: []
    };
    this.node.children.push(op);
  }

  computeGasLimit() {
    const { children } = this.root;
    let totalRequired = 0n;
    let totalCost = 0n;

    // compute the final gas cost of the root node
    for (const child of children) {
      const { required, cost } = computeGas(child);
      // totalRequired = Math.max(totalCost + required, totalRequired), but bigints, so 🤷
      totalRequired =
        totalCost + required > totalRequired
          ? totalCost + required
          : totalRequired;
      // we need to carry the _actual_ cost forward, as that is what we spend
      totalCost += cost;
    }

    return {
      cost: totalCost,
      req: totalRequired
    };
  }
}
