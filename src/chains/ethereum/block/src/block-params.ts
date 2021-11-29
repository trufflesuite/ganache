// NOTE these params may need to be changed at each hardfork
// they can be tracked here: https://github.com/ethereumjs/ethereumjs-vm/blob/master/packages/common/src/hardforks/

export const BlockParams = {
  /**
   *  Base fee per gas for blocks without a parent containing a base fee per gas.
   */
  INITIAL_BASE_FEE_PER_GAS: 1000000000n as const,
  /**
   * Divisor used to set a block's target gas usage.
   */
  ELASTICITY: 2n as const,

  /**
   * Divisor used to limit the amount the base fee per gas can change from one block to another.
   */
  BASE_FEE_MAX_CHANGE_DENOMINATOR: 8n as const
};
