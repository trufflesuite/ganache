export interface BlockTime {
  /**
   * Set the current time of the BlockTime instance. Mining immediately afterwards will result in a block timestamp of ~timestamp (some milliseconds could pass before the block is mined).
   * @param  {number | Date} timestamp - The time that should be considered "current time".
   * @returns number - The "offset" for the BlockTime instance in milliseconds.
   */
  setTime(timestamp: number | Date): number;
  
  /**
   * Get the current offset of the BlockTime instance. This is the value that would be added to the system time in order to result in the desired timestamp.
   * @returns number - The "offset" for the BlockTime instance in milliseconds.
   */
  getOffset(): number;
  
  /**
   * Set the current offset of the BlockTime instance. This is the value that would be added to the system time in order to result in the desired timestamp.
   * @param {number} offset - The "offset" for the BlockTime instance in milliseconds.
   */
  setOffset(offset: number): void;

  /**
   * Create a timestamp for a new block in seconds. Can specify the timestamp for the block, in milliseconds, which will be reflected in future calls to this function.
   * @param  {number} timestamp? - Optional - The timestamp for the block that will be mined, in milliseconds.
   * @returns number - the timestamp in seconds
   */
  createBlockTimestampInSeconds(timestamp?: number | Date): number;
}

export class ClockBasedBlockTime implements BlockTime {
  #getReferenceClockTime: () => number | Date;
  #timeOffset: number;

  private static validateTimestamp(timestamp: number | Date) {
    if (timestamp < 0) {
      throw new Error(`Invalid timestamp: ${timestamp}. Value must be positive.`);
    }
  }

  constructor(startTime: number | Date, getReferenceClockTime: () => number | Date) {
    ClockBasedBlockTime.validateTimestamp(startTime);
    this.#getReferenceClockTime = getReferenceClockTime;
    this.setTime(startTime);
  }

  getOffset(): number {
    return this.#timeOffset;                              
  }

  setOffset(offset: number) {
    const referenceTimestamp = this.#getReferenceClockTime();
    if (offset < -referenceTimestamp) {
      throw new Error(`Invalid offset: ${offset}, value must be greater than the negative of the current reference clock timestamp: ${referenceTimestamp}`);
    }
    this.#timeOffset = offset;
  }

  setTime(timestamp: number | Date): number {
    ClockBasedBlockTime.validateTimestamp(timestamp);
    this.#timeOffset = +timestamp - +this.#getReferenceClockTime();
    return this.#timeOffset;
  }

  createBlockTimestampInSeconds(timestamp?: number | Date): number {
    let milliseconds;
    if (timestamp != undefined) {
      this.setTime(timestamp);
      milliseconds = +timestamp;
    } else {
      milliseconds = +this.#getReferenceClockTime() + this.#timeOffset;
    }

    const seconds = Math.floor(milliseconds / 1000);
    return seconds;
  }
}

/*
  A BlockTime implementation that increments it's reference time by the duration specified by incrementMilliseconds,
  every time createBlockTimestampInSeconds() is called. The timestamp returned will be impacted by the timestamp offset,
  so can be moved forward and backwards by calling .putOffset() independent of the start time, and increments caused 
  by calls to createBlockTimestampInSeconds()
*/
export class IncrementBasedBlockTime extends ClockBasedBlockTime {
  readonly #tickReferenceClock;

  constructor(startTime: number | Date, incrementMilliseconds: number) {
    let referenceTime = +startTime;
    super(startTime, () => referenceTime)
    this.#tickReferenceClock = () => referenceTime += incrementMilliseconds;
  }

  override createBlockTimestampInSeconds(timestamp?: number | Date): number {
    const blockTimestamp = super.createBlockTimestampInSeconds(timestamp);
    this.#tickReferenceClock();
    return blockTimestamp;
  }
}
