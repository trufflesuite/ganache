export interface BlockTime {
  /**
   * Set the current time of the BlockTime instance. Mining immediately afterwards will result in a block timestamp of ~timestamp (some milliseconds could pass before the block is mined).
   * @param  {number} timestamp - The time that should be considered "current time".
   * @returns number - The "offset" for the BlockTime instance in milliseconds.
   */
  setTime(timestamp: number): number;

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
  createBlockTimestampInSeconds(timestamp?: number): number;
}

export class ClockBasedBlockTime implements BlockTime {
  private _getReferenceClockTime: () => number;
  private _timeOffset: number = 0;

  private static validateTimestamp(timestamp: number) {
    if (timestamp < 0) {
      throw new Error(`Invalid timestamp: ${timestamp}. Value must be positive.`);
    }
  }

  constructor(getReferenceClockTime: () => number, startTime: number | undefined) {
    this._getReferenceClockTime = getReferenceClockTime;

    if (startTime !== undefined) {
      ClockBasedBlockTime.validateTimestamp(startTime);
      this.setTime(startTime);
    }
  }

  getOffset(): number {
    return this._timeOffset;
  }

  setOffset(offset: number) {
    const referenceTimestamp = this._getReferenceClockTime();
    if (offset < -referenceTimestamp) {
      throw new Error(`Invalid offset: ${offset}, value must be greater than the negative of the current reference clock timestamp: ${referenceTimestamp}`);
    }
    this._timeOffset = offset;
  }

  setTime(timestamp: number): number {
    ClockBasedBlockTime.validateTimestamp(timestamp);
    this._timeOffset = timestamp - this._getReferenceClockTime();
    return this._timeOffset;
  }

  createBlockTimestampInSeconds(timestamp?: number): number {
    let milliseconds;
    if (timestamp != undefined) {
      this.setTime(timestamp);
      milliseconds = timestamp;
    } else {
      milliseconds = this._getReferenceClockTime() + this._timeOffset;
    }

    const seconds = Math.floor(milliseconds / 1000);
    return seconds;
  }
}

/*
  A BlockTime implementation that increments it's reference time by the duration specified by incrementMilliseconds,
  every time createBlockTimestampInSeconds() is called. The timestamp returned will be impacted by the timestamp offset,
  so can be moved forward and backwards by calling .setOffset() independent of the start time, and will increment when
  createBlockTimestampInSeconds() is called.
*/
export class IncrementBasedBlockTime extends ClockBasedBlockTime {
  private readonly _tickReferenceClock: () => void;

  constructor(startTime: number, incrementMilliseconds: number) {
    let referenceTime = startTime;
    super(() => referenceTime, startTime)
    this._tickReferenceClock = () => referenceTime += incrementMilliseconds;
  }

  override createBlockTimestampInSeconds(timestamp?: number): number {
    const blockTimestamp = super.createBlockTimestampInSeconds(timestamp);
    this._tickReferenceClock();
    return blockTimestamp;
  }
}
