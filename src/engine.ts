import ILedger from "./interfaces/ledger";

export default class Engine {
    private ledger:ILedger;
    constructor(ledger: ILedger){
        if (!ledger){
            throw new Error("yah, that's not right");
        }
        this.ledger = ledger;
    }
    public async send(method: string, params: Array<any>): Promise<any> {
        if(this.ledger.__proto__.hasOwnProperty(method)){
            const fn = this.ledger[method];
            if (typeof fn === "function") {
                return this.ledger[method].apply(this.ledger, params);
            }
        }
    }
}