export type BlockchainOptions = {
  blockTime: number;
};

export default class Blockchain implements BlockchainOptions{
  blockTime: number = 1000;

  constructor(options:BlockchainOptions) {
    Object.assign(this, options);

    
  }
}