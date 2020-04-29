import Api from "./api";
import Emittery from "emittery";
import {RequestType} from "../types";

export interface Provider<ApiImplementation extends Api>
  extends Emittery.Typed<{request: RequestType<ApiImplementation>}, "ready" | "close"> {
  close: () => Promise<void>;
}
