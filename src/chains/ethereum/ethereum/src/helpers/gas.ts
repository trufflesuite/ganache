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
  /**
   * `name` is required for distinguishing SSTORE opcodes for special rules
   */
  name: string;
  cost: bigint;
  /**
   * the minimum gas left required for the opcode to execute
   */
  minimum: bigint;
  children: Node[];
  parent: Node | null;
};

/**
 * Creates a new call tree node
 *
 * @param name The (nick)name of the opcode(s), or "ROOT" for the root node.
 * @param cost The total gas cost to run the opcode(s).
 * @param minimum The minimum gas left required for the opcode(s) to execute.
 * @param parent The parent node, or `null` if this is the root node.
 */
function createNode(
  name: string,
  cost: bigint,
  minimum: bigint,
  parent: Node | null
): Node {
  return {
    children: [],
    cost,
    minimum,
    name,
    parent
  };
}

/**
 * Creates a new call tree node and appends it to the parent's children.
 *
 * @param name The (nick)name of the opcode(s).
 * @param cost The total gas cost to run the opcode(s).
 * @param minimum The minimum gas left required for the opcode(s) to execute.
 * @param parent The parent node.
 */
function appendNewCallNode(
  name: string,
  cost: bigint,
  minimum: bigint,
  parent: Node
) {
  const newNode = createNode(name, cost, minimum, parent);
  parent.children.push(newNode);
}

/**
 * Returns the last child of the node, or undefined if there are no children.
 *
 * @param node The node to get the last child of.
 */
function getLastChild({ children }: Node): Node | undefined {
  return children[children.length - 1];
}

/**
 * Returns the larger of the two bigints.
 * @param a
 * @param b
 * @returns
 */
function max(a: bigint, b: bigint) {
  return a > b ? a : b;
}

/**
 * Computes the actual and required gas costs of the node.
 *
 * @param node The node to compute the gas costs of.
 */
function computeGas({ children, cost, minimum }: Node) {
  if (children.length === 0) {
    return {
      cost,
      minimum
    };
  } else {
    let totalRequired = 0n;
    let totalCost = 0n;
    for (const child of children) {
      const { cost: childCost, minimum } = computeGas(child);
      totalRequired = max(totalCost + minimum, totalRequired);
      // we need to carry the _actual_ cost forward, as that is what we spend
      totalCost += childCost;
    }
    const sixtyFloorths = (totalRequired * 64n) / 63n;
    return {
      cost: totalCost + cost,
      minimum: sixtyFloorths + minimum
    };
  }
}

export class GasTracer {
  root: Node;
  node: Node;
  depth: number;
  constructor(private readonly vm: VM) {
    this.node = this.root = createNode("ROOT", 0n, 0n, null);
    this.depth = 0;
  }

  install() {
    this.vm.evm.events.on("step", this.onStep.bind(this));
  }

  uninstall() {
    this.vm.evm.events.off("step", this.onStep.bind(this));
  }

  reset() {
    // reset internal node state
    this.node = this.root;
    // reset depth and clear all children from the root node
    this.depth = this.root.children.length = 0;
  }

  onStep({ opcode, depth }: InterpreterStep) {
    const fee = opcode.dynamicFee || BigInt(opcode.fee);

    // If the current opcode is SSTORE, we need to add a new node to the
    // tree and compute its minimum gas left required to execute.
    // An SSTORE will revert if `gas_left <= 2300` (even though it can
    // cost less - it's complicated). See
    // https://github.com/wolflo/evm-opcodes/blob/main/gas.md#a7-sstore
    // Note: it can also cost more than 2300, so we need to take the larger
    // of the two values (fee or 2301)
    const minimum = opcode.name === "SSTORE" ? max(fee, 2301n) : fee;

    if (depth === this.depth) {
      // The previous opcode didn't change the depth, so we can roll this
      // opcode's cost up into it's parent's last child's costs as long as it
      // isn't an SSTORE. Rolling up avoids having to iteratate over all
      // opcodes again later.

      if (opcode.name !== "SSTORE") {
        const previousSibling = getLastChild(this.node);
        // Don't roll up into a previous SSTORE as we don't want to
        // clobber the `minimum` value that it set
        if (previousSibling && previousSibling.name !== "SSTORE") {
          previousSibling.minimum = previousSibling.cost += fee;
          previousSibling.name = opcode.name;
          return; //short circuit
        }
      }
      // we don't short circuit if there was no previous sibling, or if the
      // previous sibling was an SSTORE
    } else {
      if (depth > this.depth) {
        // The previous operation was a depth-increasing OP (CALL, CREATE, etc)
        // We know this because the depth just increased.
        // We also know that getLastChild is not going to return `undefined` as
        // it is impossible to increase depth without an opcode to do so.
        // So, we need to update our parent to be the node's last child.
        this.node = getLastChild(this.node);
      } else {
        /* } else if (depth < this.depth) { */
        // The previous operation was a depth-decreasing OP (STOP, INVALID, etc)
        // This means the `this.node` can NOT have more children added to it.

        // Jump up to the current `node`'s parent.
        this.node = this.node.parent;
      }

      this.depth = depth;
    }

    // add the new node `this.node`'s call tree
    appendNewCallNode(opcode.name, fee, minimum, this.node);
  }

  computeGasLimit() {
    const { children } = this.root;
    let totalRequired = 0n;
    let totalCost = 0n;

    // compute the final gas cost of the root node
    for (const child of children) {
      const { cost: childCost, minimum } = computeGas(child);
      totalRequired = max(totalCost + minimum, totalRequired);
      // we need to carry the _actual_ cost forward, as that is what we spend
      totalCost += childCost;
    }

    return totalRequired;
  }
}
