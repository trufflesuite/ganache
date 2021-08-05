// Reference implementation: https://git.io/JtsJc
export enum SigType {
  SigTypeUnknown = 255,

  SigTypeSecp256k1 = 1, // I don't fully understand `iota`, but I put this through a golang compiler and it said it's 1
  SigTypeBLS // Purposely not explicitly stating to coincide with reference implementation (which is autoincrement)
}
