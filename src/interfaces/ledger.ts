export const optionsSymbol = Symbol("options");
export default interface ILedger {
    readonly [optionsSymbol]: any;
    readonly [key: string]: (params?: any[]) => Promise<any>;
}
