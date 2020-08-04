type FilecoinOptions = {
  automining?: boolean;
  blockTime?: number;
  ipfsPort?:number;
  logger?: {
    log:(str:string) => void;
  }
}

export default FilecoinOptions;