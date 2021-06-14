export class ParsedBlockResponse {
  priority: number;
  proof_of_work_nonce: string;
  seed_nonce_hash?: string;
  signature: string;
}
