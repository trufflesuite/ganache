type FilecoinOptions = {
  automining?: boolean;
  blockTime?: number;
  ipfsPort?:number;
  logger?: {
    log:(str:string) => void;
  },
  seed?:string;
}

export default FilecoinOptions;