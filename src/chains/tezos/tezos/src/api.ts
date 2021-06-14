import { types } from "@ganache/utils";
import { TezosInternalOptions } from "@ganache/tezos-options";
import Wallet from "./wallet";
import { assertArgLength } from "./helpers/assert-arg-length";
import {
  BlockHeader,
  BlockRequest,
  BlockRequestSchema,
  Checkpoint,
  Frozenbalancebycycle,
  GetBlockRequestSchema,
  LevelsInCurrentCycle,
  NewRequest,
  NewSchema,
  Operation,
  OperationHash,
  OperationSchema,
  ParsedBlockResponse,
  ProtocolDataResponse
} from "./things";
import {
  BakingRightsResponse,
  BlockFullHeader,
  ContractResponse,
  DelegatesResponse,
  EndorsingRightsResponse,
  EntrypointsResponse,
  Level,
  MichelsonV1Expression,
  RPCRunOperationParam,
  ScriptedContracts
} from "@taquito/rpc";
import BigNumber from "bignumber.js";
import { FromBody, FromQuery, FromUrl, Get, Post } from "./helpers/decorators";

import * as D from "io-ts/Decoder";

export default class TezosApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;
  readonly #options: TezosInternalOptions;
  readonly #wallet: Wallet;

  /**
   * This is the Tezos API that the provider interacts with.
   * The only methods permitted on the prototype are the supported json-rpc
   * methods.
   * @param options
   * @param ready Callback for when the API is fully initialized
   */
  constructor(options: TezosInternalOptions, wallet: Wallet) {
    this.#options = options;
    const { initialAccounts } = (this.#wallet = wallet);
  }

  async version(): Promise<string> {
    return this.#options.wallet.totalAccounts.toString();
  }

  //#region chain endpoints
  /**
   * Returns a list of addresses owned by client.
   * @returns Array of 20 Bytes - addresses owned by the client.
   */
  @assertArgLength(0)
  async tez_accounts() {
    return this.#wallet.initialAccounts.map(m => m.pkh);
  }

  @Post
  async "/test/:chainId/post"(
    @FromUrl("chainId", Number) chainId: string,
    @FromQuery("length", true, Number) length: number,
    @FromBody("body", OperationSchema())
    body: Operation
  ): Promise<any[]> {
    return [chainId, length, body];
  }

  /**
   * Lists block hashes from '', up to the last checkpoint, sorted with decreasing fitness.
   * Without arguments it returns the head of the chain.
   * Optional arguments allow to return the list of predecessors of a given block or of a set of blocks.
   * @returns Array of block hashes
   * $block_hash:
      A block identifier (Base58Check-encoded)
     $unistring
     $unistring:
       universal string representation
          Either a plain UTF8 string, or a sequence of bytes for strings that
          contain invalid byte sequences.
       string || { "invalid_utf8_string": [ integer ∈ [0, 255] ... ] }
   */
  @Get
  async "/chains/:chainId/blocks"(
    @FromUrl("chainId", String) chainId: string,
    @FromQuery("length", true, Number) length: number,
    @FromQuery("head", true, String) head: string,
    @FromQuery("min_date", true, Date) min_date: Date
  ): Promise<any[]> {
    return [chainId, length, head, min_date];
  }

  /**
   * @returns The current checkpoint for this chain
   */
  @Get
  async "/chains/:chainId/checkpoint"(
    @FromUrl("chainId", String) chainId: string
  ): Promise<Checkpoint> {
    return {
      block: {
        context: "context" + chainId,
        fitness: [],
        level: 1,
        operations_hash: "",
        predecessor: "",
        priority: 1,
        proof_of_work_nonce: "",
        proto: 1,
        signature: "",
        timestamp: "",
        validation_pass: 1,
        seed_nonce_hash: ""
      },
      caboose: 1,
      history_mode: "full",
      save_point: 1
    };
  }

  //#endregion

  //#region injection endpoints

  /**
   * Inject a block in the node and broadcast it. The `operations` embedded in `blockHeader` might be pre-validated using a contextual RPCs from the latest block
   * (e.g. '/blocks/head/context/preapply'). Returns the ID of the block. By default, the RPC will wait for the block to be validated before answering.
   * If ?async is true, the function returns immediately. Otherwise, the block will be validated before the result is returned.
   * If ?force is true, it will be injected even on non strictly increasing fitness. An optional ?chain parameter can be used to specify whether to inject on the test chain or the main chain.
   * @returns Array of block hash
   */
  @Post
  async "/injection/block"(
    @FromBody<BlockRequestSchema>("body", GetBlockRequestSchema())
    body: BlockRequest
  ): Promise<string> {
    return JSON.stringify(body);
  }

  /**
   * Inject an operation in node and broadcast it. Returns the ID of the operation.
   * The `signedOperationContents` should be constructed using a contextual RPCs from the latest block and signed by the client.
   * By default, the RPC will wait for the operation to be (pre-)validated before answering. See RPCs under /blocks/prevalidation for more details on the prevalidation context.
   * If ?async is true, the function returns immediately. Otherwise, the operation will be validated before the result is returned.
   * An optional ?chain parameter can be used to specify whether to inject on the test chain or the main chain.
   */
  @assertArgLength(1)
  async "/injection/operation"(signedOpBytes: string): Promise<OperationHash> {
    return "operation-hash";
  }

  //#endregion

  //#region contract endpoints

  /**
   * All existing contracts (including non-empty default contracts).
   * @returns An array of base58 implicit or originated contract hashes
   */
  @assertArgLength(0)
  async ":blockId/context/contracts"(): Promise<string[]> {
    return [];
  }

  /**
   * Access the complete status of a contract.
   * @returns contract information
   */
  @assertArgLength(0)
  async ":blockId/context/contracts/:contractId"(): Promise<ContractResponse> {
    return null;
  }

  /**
   * Access the balance of a contract.
   * @returns contract balance
   */
  @assertArgLength(0)
  async ":blockId/context/contracts/:contractId/balance"(): Promise<BigNumber> {
    return new BigNumber(12.34);
  }

  /**
   * Access the counter of a contract, if any.
   * @returns contract counter
   */
  @assertArgLength(0)
  async ":blockId/context/contracts/:contractId/counter"(): Promise<BigNumber> {
    return new BigNumber(1);
  }

  /**
   * Access the delegate of a contract, if any.
   * @returns contract delegate
   */
  @assertArgLength(0)
  async ":blockId/context/contracts/:contractId/delegate"(): Promise<string> {
    return "public_key_hash";
  }

  /**
   * @returns the list of entrypoints of the contract
   */
  @assertArgLength(0)
  async ":blockId/context/contracts/:contractId/entrypoints"(): Promise<EntrypointsResponse> {
    return null;
  }

  /**
   * @returns the type of the given entrypoint of the contract
   */
  @assertArgLength(0)
  async ":blockId/context/contracts/:contractId/entrypoints/:entrypoint"(): Promise<MichelsonV1Expression> {
    return null;
  }

  /**
   * Access the manager of a contract.
   * @returns the manager key of a contract.
   */
  @assertArgLength(0)
  async ":blockId/context/contracts/:contractId/manager_key"(): Promise<string> {
    return "public_key_of_contract";
  }

  /**
   * Access the code and data of the contract.
   * @returns the code and data of the contract.
   */
  @assertArgLength(0)
  async ":blockId/context/contracts/:contractId/script"(): Promise<ScriptedContracts> {
    return null;
  }

  /**
   * Access the data of the contract.
   * @returns the data of the contract.
   */
  @assertArgLength(0)
  async ":blockId/context/contracts/:contractId/storage"(): Promise<MichelsonV1Expression> {
    return null;
  }

  //#endregion

  //#region delegate endpoints

  /**
   * Lists all registered delegates.
   * @returns all registered delegates.
   */
  @assertArgLength(0)
  async ":blockId/context/delegates"(): Promise<string[]> {
    return [];
  }

  /**
   * Everything about a delegate.
   * @returns delegate information
   */
  @assertArgLength(0)
  async ":blockId/context/delegates/:pkh"(): Promise<DelegatesResponse> {
    return null;
  }

  /**
   * @returns the full balance of a given delegate, including the frozen balances.
   */
  @assertArgLength(0)
  async ":blockId/context/delegates/:pkh/balance"(): Promise<BigNumber> {
    return null;
  }

  /**
   * Tells whether the delegate is currently tagged as deactivated or not.
   * @returns true if delegate is deactivated else false
   */
  @assertArgLength(0)
  async ":blockId/context/delegates/:pkh/deactivated"(): Promise<boolean> {
    return false;
  }

  /**
   * @returns the balances of all the contracts that delegate to a given delegate. This excludes the delegate's own balance and its frozen balances.
   */
  @assertArgLength(0)
  async ":blockId/context/delegates/:pkh/delegated_balance"(): Promise<BigNumber> {
    return null;
  }

  /**
   * @returns the list of contracts that delegate to a given delegate.
   */
  @assertArgLength(0)
  async ":blockId/context/delegates/:pkh/delegated_contracts"(): Promise<
    string[]
  > {
    return null;
  }

  /**
   * @returns the total frozen balances of a given delegate, this includes the frozen deposits, rewards and fees.
   */
  @assertArgLength(0)
  async ":blockId/context/delegates/:pkh/frozen_balance"(): Promise<BigNumber> {
    return null;
  }

  /**
   * @returns the frozen balances of a given delegate, indexed by the cycle by which it will be unfrozen.
   */
  @assertArgLength(0)
  async ":blockId/context/delegates/:pkh/frozen_balance_by_cycle"(): Promise<Frozenbalancebycycle> {
    return null;
  }

  /**
   * Returns the cycle by the end of which the delegate might be deactivated if she fails to execute any delegate action.
   * A deactivated delegate might be reactivated (without loosing any rolls) by simply re-registering as a delegate.
   * For deactivated delegates, this value contains the cycle by which they were deactivated.
   * @returns the cycle by the end of which the delegate might be deactivated.
   */
  @assertArgLength(0)
  async ":blockId/context/delegates/:pkh/grace_period"(): Promise<number> {
    return null;
  }

  /**
   * This includes the balances of all the contracts that delegate to it, but also the balance of the delegate itself and its frozen fees and deposits.
   * The rewards do not count in the delegated balance until they are unfrozen.
   * @returns the total amount of tokens delegated to a given delegate.
   */
  @assertArgLength(0)
  async ":blockId/context/delegates/:pkh/staking_balance"(): Promise<BigNumber> {
    return null;
  }

  //#endregion

  //#region context endpoints

  /**
   * Info about the nonce of a previous block.
   * @returns the info about the nonce of a previous block.
   */
  @assertArgLength(0)
  async ":blockId/context/nonces/:blockLevel"(): Promise<string> {
    return null;
  }

  /**
   * @returns the raw context.
   */
  @assertArgLength(0)
  async ":blockId/context/raw/bytes"(): Promise<string> {
    return null;
  }

  /**
   * Seed of the cycle to which the block belongs.
   * @returns the seed of the cycle to which the block belongs.
   */
  @assertArgLength(0)
  async ":blockId/context/raw/seed"(seed: any): Promise<string> {
    return null;
  }

  /**
   * Get the endorsing power of an endorsement, that is, the number of slots that the endorser has
   * @returns the endorsing power.
   */
  @assertArgLength(0)
  async ":blockId/context/raw/endorsing_power"(
    rpcRunOperationParam: RPCRunOperationParam
  ): Promise<number> {
    return null;
  }

  //#endregion

  //#region helpers endpoints

  /**
   * Retrieves the list of delegates allowed to bake a block. By default, it gives the best baking priorities for bakers that have at least one opportunity below the 64th priority for the next block.
   * Parameters `level` and `cycle` can be used to specify the (valid) level(s) in the past or future at which the baking rights have to be returned. Parameter `delegate` can be used to restrict the results to the given delegates.
   * If parameter `all` is set, all the baking opportunities for each baker at each level are returned, instead of just the first one. Returns the list of baking slots. Also returns the minimal timestamps that correspond to these slots.
   * The timestamps are omitted for levels in the past, and are only estimates for levels later that the next block, based on the hypothesis that all predecessor blocks were baked at the first priority.
   * @returns the baking rights response.
   */
  @assertArgLength(0)
  async ":blockId/helpers/baking_rights"(): Promise<BakingRightsResponse> {
    return null;
  }

  /**
   * Try to complete a prefix of a Base58Check-encoded data. This RPC is actually able to complete hashes of block, operations, public_keys and contracts.
   */
  @assertArgLength(0)
  async ":blockId/helpers/complete/:prefix"(): Promise<string[]> {
    return null;
  }

  /**
   * Returns the level of the interrogated block, or the one of a block located `offset` blocks after in the chain (or before when negative).
   * For instance, the next block if `offset` is 1.
   * @returns the current level of the block.
   */
  @assertArgLength(0)
  async ":blockId/helpers/current_level"(): Promise<Level> {
    return null;
  }

  /**
   * Retrieves the delegates allowed to endorse a block. By default, it gives the endorsement slots for delegates that have at least one in the next block.
   * Parameters `level` and `cycle` can be used to specify the (valid) level(s) in the past or future at which the endorsement rights have to be returned.
   * Parameter `delegate` can be used to restrict the results to the given delegates. Returns the list of endorsement slots. Also returns the minimal timestamps that correspond to these slots.
   * The timestamps are omitted for levels in the past, and are only estimates for levels later that the next block, based on the hypothesis that all predecessor blocks were baked at the first priority.
   * @returns the endorsing rights response.
   */
  @assertArgLength(0)
  async ":blockId/helpers/endorsing_rights"({
    blockId
  }: {
    blockId: string;
  }): Promise<EndorsingRightsResponse> {
    return null;
  }

  /**
   * Forge an operation.
   * @returns the protocol response.
   */
  @assertArgLength(0)
  async ":blockId/helpers/forge/operations"(
    blockFullHeader: BlockFullHeader
  ): Promise<ProtocolDataResponse> {
    return null;
  }

  /**
   * Forge a block header.
   * @returns the raw block header.
   */
  @assertArgLength(0)
  async ":blockId/helpers/forge_block_header"(
    blockFullHeader: BlockFullHeader
  ): Promise<BlockHeader> {
    return null;
  }

  /**
   * Levels of a cycle.
   * @returns the levels of a cycle.
   */
  @assertArgLength(0)
  async ":blockId/helpers/levels_in_current_cycle"(): Promise<LevelsInCurrentCycle> {
    return null;
  }

  /**
   * Parse a block.
   */
  @assertArgLength(0)
  async ":blockId/helpers/parse/block"(
    blockFullHeader: BlockFullHeader
  ): Promise<ParsedBlockResponse> {
    return null;
  }

  //#endregion

  //#region operations endpoints

  //#endregion
}
