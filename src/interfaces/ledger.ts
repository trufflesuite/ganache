export default interface ILedger {
    options: any;
    readonly [key: string]: (params?: Array<any>) => Promise<any>;
}