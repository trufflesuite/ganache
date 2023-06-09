import { Interpreter } from "@ethereumjs/evm/dist/interpreter";
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

const CALL_STIPEND = 2300n;
const MIN_SSTORE_GAS = 2301n;

const SSTORE = 0x55;
const CALL = 0xf1;
const CALLCODE = 0xf2;

type Node = {
  /**
   * `code` is required for distinguishing SSTORE opcodes for special rules
   */
  code: number;
  cost: bigint;
  /**
   * the minimum gas left required for the opcode to execute
   */
  minimum: bigint;
  stipend: bigint;
  children: Node[];
  parent: Node | null;
  name: string;
};

function valueFromCALLStack(stack: bigint[]) {
  return stack[stack.length - 3];
}

/**
 * Creates a new call tree node
 *
 * @param code The code of the opcode(s), or -1 for the root node.
 * @param cost The total gas cost to run the opcode(s).
 * @param minimum The minimum gas left required for the opcode(s) to execute.
 * @param parent The parent node, or `null` if this is the root node.
 */
function createNode(
  code: number,
  cost: bigint,
  minimum: bigint,
  stipend: bigint,
  parent: Node | null,
  name: string
): Node {
  return {
    children: [],
    cost,
    minimum,
    stipend,
    code,
    parent,
    name
  };
}

/**
 * Creates a new call tree node and appends it to the parent's children.
 *
 * @param code The code of the opcode.
 * @param cost The total gas cost to run the opcode(s).
 * @param minimum The minimum gas left required for the opcode(s) to execute.
 * @param parent The parent node.
 */
function appendNewCallNode(
  code: number,
  cost: bigint,
  minimum: bigint,
  stipend: bigint,
  parent: Node,
  name: string
) {
  const newNode = createNode(code, cost, minimum, stipend, parent, name);
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
 * @param child The node to compute the gas costs of.
 */
function _computeGas(child: Node) {
  const { children, cost, minimum, stipend } = child;
  if (children.length === 0) {
    (child as any).computed = minimum;
    return {
      cost: max(cost - stipend, 0n),
      minimum: minimum
    };
  } else {
    let totalMinimum = 0n;
    let totalCost = 0n;
    for (const child of children) {
      const { cost: childCost, minimum } = _computeGas(child);
      totalMinimum = max(totalCost + minimum, totalMinimum);
      // we need to carry the _actual_ cost forward, as that is what we spend
      totalCost += childCost;
    }

    if (stipend !== 0n) {
      totalMinimum = max(0n, totalMinimum - stipend);
      totalCost -= stipend;
    }

    // The computation the EVM makes is:
    // `currentGasLeft + currentGasLeft/64 = availableGasLeft`
    // We start with `availableGasLeft` and need to solve for `currentGasLeft`,
    // which is:
    // `currentGasLeft = (availableGasLeft * 64) / 63
    // See: https://www.wolframalpha.com/input?i=x+-+%28x%2F64%29+%3D+y
    const sixtyFloorths = computeAllButOneSixtyFourth(totalMinimum);
    (child as any).computed = sixtyFloorths + minimum;
    return {
      cost: totalCost + cost,
      minimum: sixtyFloorths + minimum
    };
  }
}

function computeAllButOneSixtyFourth(minimumGas: bigint) {
  // it's possible for the minimum gas to be zero, without this check we'll
  // end up returning -1n, which is, um, wrong.
  if (minimumGas === 0n) return 0n;

  // The computation the EVM makes is:
  // `availableGasLeft = Math.floor(currentGasLeft + currentGasLeft/64)`
  // We start with a `gasRequired` and need to solve for `currentGasLeft`,
  // which is:
  // `currentGasLeft = (gasRequired * 64) / 63
  const allButOneSixtyFourths = (minimumGas * 64n) / 63n;

  // Because of 1/64th flooring there is precision loss when we want to
  // reverse it. This means there are sometimes two numbers that resolve
  // to the same "all by 1/64th" number. We should always pick the smaller
  // of the two, since they both will compute the same "all by 1/64th"
  // anyway.
  // Two example `gasLeft`s that will result in the same "all by 1/64th"
  // number are `1023` and `1024`. The "all by 1/64th" number is `1008`.
  //https://www.wolframalpha.com/input?i=x+-+%E2%8C%8A%28x%2F64%29%E2%8C%8B+%3D+1008
  return allButOneSixtyFourths % 64n === 0n
    ? allButOneSixtyFourths - 1n
    : allButOneSixtyFourths;
}

/**
 * Computes the actual and required gas costs of the node.
 *
 * @param root The root node to compute the gas costs of.
 */
function computeGasIt(root: Node) {
  // Initialize stack with root node
  const stack: {
    node: Node;
    parentResult?: { cost: bigint; minimum: bigint };
  }[] = [{ node: root }];
  const results: Map<Node, { cost: bigint; minimum: bigint }> = new Map();

  while (stack.length > 0) {
    const { node, parentResult } = stack[stack.length - 1];
    let totalMinimum = 0n;
    let totalCost = 0n;

    if (node.children.length > 0 && !parentResult) {
      // Push all children to stack, marking the parent as having been processed
      stack[stack.length - 1].parentResult = { cost: 0n, minimum: 0n };
      for (const child of node.children) {
        stack.push({ node: child });
      }
    } else {
      // Process node
      stack.pop();
      if (node.children.length === 0) {
        const cost = max(node.cost - node.stipend, 0n);
        results.set(node, {
          cost,
          minimum: node.minimum
        });
      } else {
        for (const child of node.children) {
          const { cost: childCost, minimum } = results.get(child) as {
            cost: bigint;
            minimum: bigint;
          };
          totalMinimum = max(totalCost + minimum, totalMinimum);
          // we need to carry the _actual_ cost forward, as that is what we spend
          totalCost += childCost;
        }

        if (node.stipend !== 0n) {
          totalMinimum = max(0n, totalMinimum - node.stipend);
          totalCost -= node.stipend;
        }

        const allButOneSixtyFourths = computeAllButOneSixtyFourth(totalMinimum);

        results.set(node, {
          cost: totalCost + node.cost,
          minimum: allButOneSixtyFourths + node.minimum
        });
      }
    }
  }

  return results.get(root);
}

function solveForX(y) {
  const divisor = BigInt(64);
  let x = BigInt(y) * divisor;
  let lowerBound = x - divisor;
  let upperBound = x;
  let result = null;

  while (lowerBound <= upperBound) {
    const mid = (lowerBound + upperBound) / BigInt(2);
    const floorMid = mid - mid / divisor;

    if (floorMid === y) {
      result = mid;
      break;
    } else if (floorMid > y) {
      upperBound = mid - BigInt(1);
    } else {
      lowerBound = mid + BigInt(1);
    }
  }

  return result;
}

export class GasTracer {
  root: Node;
  node: Node;
  depth: number;
  constructor(private readonly vm: VM) {
    this.node = this.root = createNode(-1, 0n, 0n, undefined, null, "ROOT");
    this.depth = 0;
  }

  _originalRunStep: any;
  install() {
    // we share this one `evm.onRunStep` function so we need to be nice.
    // hack: it's gross and should be fixed later :-)
    const evm: any = this.vm.evm;
    const runStep = evm.onRunStep;
    if (runStep) this._originalRunStep = runStep;
    evm.onRunStep = (...args: any) => {
      runStep && runStep.apply(evm, args);
      this.onStep.apply(this, args);
    };
  }

  uninstall() {
    const evm: any = this.vm.evm;
    delete evm.onRunStep;
    if (this._originalRunStep) evm.onRunStep = this._originalRunStep;
  }

  /**
   * Is called after every transaction.
   */
  reset() {
    // reset internal node state
    this.node = this.root;
    // reset depth and clear all children from the root node
    this.depth = this.root.children.length = 0;
  }

  /**
   * Runs after every opcode execution.
   *
   * @param stack
   * @param depth
   * @param fee
   * @param opcode
   * @returns
   */
  onStep(
    _: Interpreter,
    stack: bigint[],
    depth: number,
    fee: bigint,
    opcode: number,
    gasLeft: bigint,
    name: string
  ) {
    let minimum: bigint;
    let stipend: bigint;
    switch (opcode) {
      case 0x55:
        // If the current opcode is SSTORE, we need to add a new node to the
        // tree and compute its minimum gas left required to execute.
        // An SSTORE will revert if `gas_left <= 2300` (even though it can
        // cost less - it's complicated). See
        // https://github.com/wolflo/evm-opcodes/blob/main/gas.md#a7-sstore
        // Note: it can also cost more than 2300, so we need to take the larger
        // of the two values (fee or 2301)
        minimum = max(fee, MIN_SSTORE_GAS);
        stipend = 0n;
        break;
      case CALL:
      case CALLCODE:
        minimum = fee;
        if (valueFromCALLStack(stack) !== 0n) stipend = CALL_STIPEND;
        else stipend = 0n;
        break;
      default:
        minimum = fee;
        stipend = 0n;
    }

    // CALL CALL

    if (depth === this.depth) {
      // The previous opcode didn't change the depth, so we can roll this
      // opcode's cost up into it's parent's last child's costs as long as it
      // isn't an SSTORE. Rolling up avoids having to iteratate over all
      // opcodes again later.

      if (opcode !== SSTORE) {
        const previousSibling = getLastChild(this.node);
        // Don't roll up into a previous SSTORE as we don't want to
        // clobber the `minimum` value that it set
        if (
          previousSibling &&
          previousSibling.code !== SSTORE &&
          // hack: if the target of a call is an address without contract code,
          // the additional depth will not be created, causing the sibling to be
          // over-written (we need it to be a single node to ensure that it's
          // stipend is applied correctly). (actually if it has no children, we
          // can probably calculate it's minimum, cost, and stipend, but will
          // need to handle it's stipend correctly)
          previousSibling.stipend === 0n
        ) {
          previousSibling.minimum = previousSibling.cost += fee;
          previousSibling.name = name;
          previousSibling.code = opcode;
          // if there's a stipend, then we're definetely stepping into a new
          // callframe, so the next opcode will have depth + 1, meaning it'll
          // correctly be a child of the call node.

          previousSibling.stipend = stipend;
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
    appendNewCallNode(opcode, fee, minimum, stipend, this.node, name);
  }

  /**
   * Computes the minimum gas required for the transaction to execute.
   *
   * Return value does not include refunds or intrinsic gas.
   *
   * @returns
   */
  computeGasLimit() {
    const { children } = this.root;
    let totalRequired = 0n;
    let totalCost = 0n;

    // compute the final gas cost of the root node
    for (const child of children) {
      const { cost: childCost, minimum } = computeGasIt(child);
      totalRequired = max(totalCost + minimum, totalRequired);
      // we need to carry the _actual_ cost forward, as that is what we spend
      totalCost += childCost;
    }

    return totalRequired;
  }
}
