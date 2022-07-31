/**
 * Throws if the timestamp is not valid (for the purposes of providing a block timestamp). Although a negative
 * timestamp is generally valid, this cannot be represented by the block timestamp (Quantity must be a positive
 * integer value).
 * @param  {number} timestamp - the timestamp to validate
 */
function validateBlockTimestamp(timestamp: number) {
  if (timestamp < 0) {
    throw new Error(
      `Invalid block timestamp: ${timestamp}. Timestamp must be positive.`
    );
  }
}

/**
 * A BlockTime implementation that will create a block time offset from the provided reference clock. If a
 * value is provided as the startTime argument to the constructor, the offset will be calculated as the
 * difference between the startTime and the current value of the reference clock, otherwise no offset will
 * be used (unless calls are made to setOffset(), or setTime()).
 */
export class BlockTime {
  protected _getReferenceClockTime: () => number;
  protected _offsetMilliseconds: number = 0;

  /**
   * Create an instance of BlockTime from the system clock. If the startTime argument is provided, the instance
   * will be offset from the system clock such that its initial time is equal to the value provided.
   * @param  {number} startTime? the start time of the BlockTime instance
   * @returns BlockTime - a BlockTime instance using the system clock as it's reference clock
   */
  public static fromSystemClock(startTime?: number): BlockTime {
    return new BlockTime(Date.now, startTime);
  }

  /**
   * Create a new BlockTime instance, which will use the provided getReferenceClockTime function to fetch the
   * "current" time. If the startTime argument is specified, the instance will be offset from the system clock
   * such that its initial time is equal to the value provided.
   * @param  {()=>number} getReferenceClockTime
   * @param  {number} startTime?
   */
  constructor(
    getReferenceClockTime: () => number,
    startTime?: number
  ) {
    this._getReferenceClockTime = getReferenceClockTime;

    if (startTime !== undefined) {
      validateBlockTimestamp(startTime);
      this.setTime(startTime);
    }
  }

  /**
   * Get the current offset of the BlockTime instance. This represents the duration between the
   * "reference" time, and the timestamp that would be returned by a call to createBlockTimestampInSeconds().
   * @returns number - The "offset" for the BlockTime instance in milliseconds.
   */
  getOffset(): number {
    return this._offsetMilliseconds;
  }

  /**
   * Set the current offset of the BlockTime instance. This represents the duration between the
   * "reference" time, and the timestamp that would be returned by a call to createBlockTimestampInSeconds().
   * @param {number} offset - The "offset" for the BlockTime instance in milliseconds.
   */
  setOffset(offset: number) {
    const referenceTimestamp = this._getReferenceClockTime();
    validateBlockTimestamp(referenceTimestamp + offset);

    this._offsetMilliseconds = offset;
  }

  /**
   * Set the current time of the BlockTime instance. Mining immediately afterwards will result in
   * a block timestamp of ~timestamp (depending on the impliementation, some milliseconds may pass
   * before the block is mined).
   * @param  {number} timestamp - The time that should be considered "current time".
   * @returns number - The "offset" for the BlockTime instance in milliseconds.
   */
  setTime(timestamp: number): number {
    validateBlockTimestamp(timestamp);
    this._offsetMilliseconds = timestamp - this._getReferenceClockTime();
    return this._offsetMilliseconds;
  }

  /**
   * Create a timestamp for a new block in seconds. Can specify the timestamp for the block, in milliseconds,
   * which will be reflected in future calls to this function.
   * @param  {number} timestamp? - Optional - The timestamp for the block that will be mined, in milliseconds.
   * @returns number - the timestamp in seconds
   */
  createBlockTimestampInSeconds(timestamp?: number): number {
    let milliseconds;
    if (timestamp != undefined) {
      this.setTime(timestamp);
      milliseconds = timestamp;
    } else {
      milliseconds = this._getReferenceClockTime() + this._offsetMilliseconds;
    }

    const seconds = Math.floor(milliseconds / 1000);
    return seconds;
  }
}

/**
 * A BlockTime implementation that will create a series of incremental block times. Every time
 * createBlockTimestampInSeconds() is called, the offset is incremented by the duration specified
 * by incrementMilliseconds. The offset represents the total duration of all "increments" that
 * have accumulated since the start of the clock (may vary as a result of calls to setTime()
 * or setOffset()).
 *
 * @example
 * const blockTime = new IncrementBasedBlockTime(10, 2);
 *
 * // 10
 * blockTime.createBlockTimestampInSeconds();
 *
 * // 12
 * blockTime.createBlockTimestampInSeconds();
 *
 * // 14
 * blockTime.createBlockTimestampInSeconds();
 *
 * // 6 (includes the increment _since_ the 14s block time)
 * blockTime.getOffset();
 */
export class IncrementBasedBlockTime extends BlockTime {
  private readonly _incrementMilliseconds;

  constructor(startTime: number, incrementMilliseconds: number) {
    validateBlockTimestamp(startTime);
    super(() => startTime, undefined);
    this._incrementMilliseconds = incrementMilliseconds;
  }

  /**
   * Create a timestamp for a new block in seconds. Can specify the timestamp for the block, in milliseconds,
   * which will be reflected in future calls to this function. Increments the offset value by the duration specified
   * in the constructor argument `incrementMilliseconds` after creating the timestamp.
   * @param  {number} timestamp? - Optional - The timestamp for the block that will be mined, in milliseconds.
   * @returns number - the timestamp in seconds
   */
  createBlockTimestampInSeconds(timestamp?: number): number {
    const seconds = super.createBlockTimestampInSeconds(timestamp);
    this._offsetMilliseconds += this._incrementMilliseconds;
    return seconds;
  }
}
