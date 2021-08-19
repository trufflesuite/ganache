import { EIP2930AccessListTransaction } from "./eip2930-access-list-transaction";
import { LegacyTransaction } from "./legacy-transaction";

export type TypedTransaction = LegacyTransaction | EIP2930AccessListTransaction;
export type Capability = 2718 | 2930;
