
// export type HexType = HexData & string;

// export interface HexType {
//   toString(): string
//   valueOf(): string
// };

class HexData extends String{
  private data: Buffer;
  constructor(data: string|Buffer) {
    super();
    this.data = Buffer.isBuffer(data) ? data : Buffer.from(data as string);
  }
  toString(): string {
    return this.data.toString("hex");
  }
  valueOf(): string {
    return this.toString();
  }
}

const fn = ((data: string|Buffer): HexData => {
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data as string);
  const s = "" as HexData;
  s.toString = () => {
    return d.toString("hex");
  }

  return s;
});

export const HexDataImpl = fn as any as String;

export class thing {
  constructor(data: string|Buffer){
    
  }
}

type HexData = string & thing;
export default HexData;