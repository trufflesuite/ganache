import { CID, SerializedCID } from "./cid";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
interface RootCIDConfig {
  properties: {
    root: {
      type: CID;
      serializedType: SerializedCID;
      serializedName: "/";
    };
  };
}
declare type C = RootCIDConfig;
declare class RootCID
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  asPath(): string;
  root: CID;
}
declare type SerializedRootCID = SerializedObject<C>;
export { RootCID, SerializedRootCID };
