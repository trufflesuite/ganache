export type RpcTransaction =
  | {
      from: string;
      nonce?: string;
      gasPrice?: string;
      gas?: string;
      gasLimit?: never;
      to?: string;
      value?: string;
      data?: string;
      input?: never;
    }
  | {
      from: string;
      nonce?: string;
      gasPrice?: string;
      /**
       * Alias for `gas`
       */
      gasLimit?: string;
      gas?: never;
      to?: string;
      value?: string;
      data?: string;
      input?: never;
    }
  | {
      from: string;
      nonce?: string;
      gasPrice?: string;
      gas?: string;
      gasLimit?: never;
      to?: string;
      value?: string;
      /**
       * Alias for `data`
       */
      input?: string;
      data?: never;
    }
  | {
      from: string;
      nonce?: string;
      gasPrice?: string;
      /**
       * Alias for `gas`
       */
      gasLimit?: string;
      gas?: never;
      to?: string;
      value?: string;
      /**
       * Alias for `data`
       */
      input?: string;
      data?: never;
    }
  // vrs
  | {
      from?: string;
      nonce: string;
      gasPrice?: string;
      gas?: string;
      gasLimit?: never;
      to?: string;
      value?: string;
      data?: string;
      input?: never;
      v: string;
      r: string;
      s: string;
    }
  | {
      from?: string;
      nonce: string;
      gasPrice?: string;
      /**
       * Alias for `gas`
       */
      gasLimit?: string;
      gas?: never;
      to?: string;
      value?: string;
      data?: string;
      input?: never;
      v: string;
      r: string;
      s: string;
    }
  | {
      from?: string;
      nonce: string;
      gasPrice?: string;
      gas?: string;
      gasLimit?: never;
      to?: string;
      value?: string;
      /**
       * Alias for `data`
       */
      input?: string;
      data?: never;
      v: string;
      r: string;
      s: string;
    }
  | {
      from?: string;
      nonce: string;
      gasPrice?: string;
      /**
       * Alias for `gas`
       */
      gasLimit?: string;
      gas?: never;
      to?: string;
      value?: string;
      /**
       * Alias for `data`
       */
      input?: string;
      data?: never;
      v: string;
      r: string;
      s: string;
    };
