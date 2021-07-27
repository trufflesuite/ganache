import { AccessListTransaction } from "./access-list-transaction";
import { LegacyTransaction } from "./legacy-transaction";

export type TypedTransaction = LegacyTransaction | AccessListTransaction;
