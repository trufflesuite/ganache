import type Emittery from "emittery";
import { Block } from "./block";

type SinglyLinkedList<T> = { current: T; next: SinglyLinkedList<T> };

export type Snapshot = {
  block: Block;
  timeAdjustment: number;
};

export type Snapshots = {
  readonly snaps: Snapshot[];

  /**
   * This is a rudimentary Singly Linked List Node. SLL implementation is up to
   * you.
   */
  blocks: SinglyLinkedList<Buffer>;

  /**
   * Function that should be used to remove the "block" listener
   */
  unsubscribeFromBlocks: Emittery.UnsubscribeFn | null;
};
