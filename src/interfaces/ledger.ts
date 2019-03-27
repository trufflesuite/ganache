export const optionsSymbol = Symbol("options");
export default interface ILedger {
    readonly [optionsSymbol]: any;
    readonly [key: string]: (params?: Array<any>) => Promise<any>;
}
