import JSBI from "jsbi";

declare global {
    interface DataView {
        setBigUint64(byteOffset: number, value: bigint | JSBI, littleEndian?: boolean): void;
        getBigUint64(byteOffset: number, littleEndian?: boolean): void;
    }
}

/**
 * Installs support for bigint helpers on the DataView prototype, allowing for
 * converting bigint's to a Buffer, and vis-versa.
 */
export const install = () => {
    DataView.prototype._setBigUint64 = DataView.prototype.setBigUint64;
    DataView.prototype.setBigUint64 = function(byteOffset: number, value: bigint | JSBI, littleEndian: boolean = undefined) {
        if (typeof value === 'bigint' && typeof this._setBigUint64 !== 'undefined') {
            // the original native implementation for bigint
            this._setBigUint64(byteOffset, value, littleEndian);
        } else if (value.constructor === JSBI && typeof (value as any).sign === 'bigint' && typeof this._setBigUint64 !== 'undefined') {
            // JSBI wrapping a native bigint
            this._setBigUint64(byteOffset, (value as any).sign, littleEndian);
        } else if (value.constructor === JSBI) {
            // JSBI polyfill implementation
            let lowWord = (value as any)[0], highWord = 0;
            if ((value as any).length >= 2) {
                highWord = (value as any)[1];
            }
            this.setUint32(littleEndian ? 0 : 4, lowWord, littleEndian);
            this.setUint32(littleEndian ? 4 : 0, highWord, littleEndian);
        } else {
            throw TypeError('Value needs to be BigInt or JSBI');
        }
    }

    DataView.prototype._getBigUint64 = DataView.prototype.getBigUint64;
    DataView.prototype.getBigUint64 = function(byteOffset: number, littleEndian: boolean = undefined) {
        if (typeof this._setBigUint64 !== 'undefined') {
            return BigInt(this._getBigUint64(byteOffset, littleEndian));
        } else {
            let lowWord = 0, highWord = 0;
            lowWord = this.getUint32(littleEndian ? 0 : 4, littleEndian);
            highWord = this.getUint32(littleEndian ? 4 : 0, littleEndian);
            const result = JSBI.BigInt(2);
            (result as any).__setDigit(0, lowWord);
            (result as any).__setDigit(1, highWord);
            return result;
        }
    }
};
