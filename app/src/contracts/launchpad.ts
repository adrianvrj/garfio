import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export const Errors = {
  1: {message:"PairNotAllowed"},
  2: {message:"PairExists"},
  3: {message:"UnknownMeme"},
  4: {message:"InvalidAmount"},
  5: {message:"Slippage"},
  6: {message:"Graduated"},
  7: {message:"NotCreator"},
  8: {message:"InvalidMetadata"},
  9: {message:"NothingToClaim"},
  11: {message:"NotGraduated"},
  12: {message:"Migrated"},
  15: {message:"NotMigrated"},
  16: {message:"VaultEmpty"}
}







export type Key = {tag: "Admin", values: void} | {tag: "MemeWasm", values: void} | {tag: "AmmFactory", values: void} | {tag: "DivBps", values: void} | {tag: "MemeCount", values: void} | {tag: "Pairs", values: void} | {tag: "MemeAt", values: readonly [u32]} | {tag: "Pair", values: readonly [string]} | {tag: "Curve", values: readonly [string]} | {tag: "ProtocolFees", values: readonly [string]} | {tag: "Position", values: readonly [string, string]};


export interface Curve {
  /**
 * Memes burned by migration leftovers and buybacks.
 */
burned: i128;
  created_at: u64;
  creator: string;
  /**
 * Pair paid to the meme's holders as dividends so far, through the token.
 */
dividends: i128;
  fees_creator: i128;
  graduated: boolean;
  name: string;
  pair: string;
  /**
 * Soroswap pair holding the liquidity once the curve has migrated.
 */
pool: Option<string>;
  real_pair: i128;
  sold: i128;
  symbol: string;
  token: string;
  v_pair: i128;
  v_token: i128;
  /**
 * Pair set aside for the meme's holders: a quarter of each fee, the create fee and the
 * reserve the pool did not need, less the `div_bps` share paid to the holders.
 * Once migrated, `buyback` spends it on memes and burns them.
 */
vault: i128;
}


export interface PairCfg {
  /**
 * Paid by the creator in the pair at `create`; it seeds the meme's vault.
 */
create_fee: i128;
  grad_target: i128;
  v_pair0: i128;
}


/**
 * What a trader bought on the curve and still holds, at average cost, in the meme's pair.
 */
export interface Position {
  cost: i128;
  held: i128;
  realized: i128;
}

export interface Client {
  /**
   * Construct and simulate a buy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pays up to `pair_in` of the meme's pair and receives memes.
   */
  buy: ({buyer, meme, pair_in, min_out}: {buyer: string, meme: string, pair_in: i128, min_out: i128}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pair: ({pair}: {pair: string}, options?: MethodOptions) => Promise<AssembledTransaction<PairCfg>>

  /**
   * Construct and simulate a sell transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sells `amount` memes back to the curve for the pair, minus the 1% fee.
   */
  sell: ({seller, meme, amount, min_pair}: {seller: string, meme: string, amount: i128, min_pair: i128}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a curve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  curve: ({meme}: {meme: string}, options?: MethodOptions) => Promise<AssembledTransaction<Curve>>

  /**
   * Construct and simulate a memes transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Memes `start..start + limit` in creation order; `limit` is capped at 50.
   */
  memes: ({start, limit}: {start: u32, limit: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a pairs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pairs: (options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a create transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deploys a new memecoin paired against `pair` and mints its whole supply here. The pair's
   * create fee seeds the meme's vault. A positive `dev_buy` is spent on the curve for the
   * creator in the same transaction, before anyone else.
   */
  create: ({creator, name, symbol, pair, dev_buy}: {creator: string, name: string, symbol: string, pair: string, dev_buy: i128}, options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a curves transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The curves of `memes(start, limit)`, in one call.
   */
  curves: ({start, limit}: {start: u32, limit: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Array<Curve>>>

  /**
   * Construct and simulate a buyback transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Spends up to 1% of the pool's pair reserve from a migrated meme's vault on the meme,
   * and burns what it buys. Anyone can call it, as often as the vault lasts.
   */
  buyback: ({meme}: {meme: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a div_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  div_bps: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a migrate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Seeds a Soroswap pool with a graduated meme's last 200M and its reserve, at the curve's
   * final price, and keeps the LP shares here for good. Anyone can call it.
   * 
   * Anyone can also create the pool first and seed it at another price, which would hand the
   * reserve to them through the pool's share math. So when the pool already holds reserves,
   * the launchpad first swaps it back to the curve's price (buying whatever the seeder made
   * cheap) and then deposits in the pool's exact proportion. Memes left over are burned and
   * pair left over goes to the meme's vault.
   */
  migrate: ({meme}: {meme: string}, options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Replaces this contract's code; its address and storage stay.
   */
  upgrade: ({wasm_hash}: {wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Allows `pair` as a reserve asset. `v_pair0` is its virtual starting reserve, and
   * `create_fee` what launching a meme on it costs, in the pair.
   */
  add_pair: ({pair, v_pair0, create_fee}: {pair: string, v_pair0: i128, create_fee: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * `trader`'s curve position in `meme`, all zeros if they never bought it.
   */
  position: ({trader, meme}: {trader: string, meme: string}, options?: MethodOptions) => Promise<AssembledTransaction<Position>>

  /**
   * Construct and simulate a quote_buy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * (memes out, pair charged, fee) for paying up to `pair_in`.
   */
  quote_buy: ({meme, pair_in}: {meme: string, pair_in: i128}, options?: MethodOptions) => Promise<AssembledTransaction<readonly [i128, i128, i128]>>

  /**
   * Construct and simulate a claim_fees transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sends the creator's accumulated 0.5% fees, in the meme's pair.
   */
  claim_fees: ({creator, meme}: {creator: string, meme: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a meme_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  meme_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a quote_sell transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * (pair out after fee, fee) for selling `amount` memes.
   */
  quote_sell: ({meme, amount}: {meme: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<readonly [i128, i128]>>

  /**
   * Construct and simulate a amm_factory transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  amm_factory: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a protocol_fees transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  protocol_fees: ({pair}: {pair: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a set_meme_wasm transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_meme_wasm: ({meme_wasm}: {meme_wasm: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a claim_protocol transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim_protocol: ({pair, to}: {pair: string, to: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, meme_wasm, amm_factory, div_bps}: {admin: string, meme_wasm: Buffer, amm_factory: string, div_bps: u32},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, meme_wasm, amm_factory, div_bps}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADQAAAAAAAAAOUGFpck5vdEFsbG93ZWQAAAAAAAEAAAAAAAAAClBhaXJFeGlzdHMAAAAAAAIAAAAAAAAAC1Vua25vd25NZW1lAAAAAAMAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAAEAAAAAAAAAAhTbGlwcGFnZQAAAAUAAAAAAAAACUdyYWR1YXRlZAAAAAAAAAYAAAAAAAAACk5vdENyZWF0b3IAAAAAAAcAAAAAAAAAD0ludmFsaWRNZXRhZGF0YQAAAAAIAAAAAAAAAA5Ob3RoaW5nVG9DbGFpbQAAAAAACQAAAAAAAAAMTm90R3JhZHVhdGVkAAAACwAAAAAAAAAITWlncmF0ZWQAAAAMAAAAAAAAAAtOb3RNaWdyYXRlZAAAAAAPAAAAAAAAAApWYXVsdEVtcHR5AAAAAAAQ",
        "AAAAAAAAADtQYXlzIHVwIHRvIGBwYWlyX2luYCBvZiB0aGUgbWVtZSdzIHBhaXIgYW5kIHJlY2VpdmVzIG1lbWVzLgAAAAADYnV5AAAAAAQAAAAAAAAABWJ1eWVyAAAAAAAAEwAAAAAAAAAEbWVtZQAAABMAAAAAAAAAB3BhaXJfaW4AAAAACwAAAAAAAAAHbWluX291dAAAAAALAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAEcGFpcgAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAB9AAAAAHUGFpckNmZwA=",
        "AAAAAAAAAEZTZWxscyBgYW1vdW50YCBtZW1lcyBiYWNrIHRvIHRoZSBjdXJ2ZSBmb3IgdGhlIHBhaXIsIG1pbnVzIHRoZSAxJSBmZWUuAAAAAAAEc2VsbAAAAAQAAAAAAAAABnNlbGxlcgAAAAAAEwAAAAAAAAAEbWVtZQAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIbWluX3BhaXIAAAALAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAFY3VydmUAAAAAAAABAAAAAAAAAARtZW1lAAAAEwAAAAEAAAfQAAAABUN1cnZlAAAA",
        "AAAAAAAAAEhNZW1lcyBgc3RhcnQuLnN0YXJ0ICsgbGltaXRgIGluIGNyZWF0aW9uIG9yZGVyOyBgbGltaXRgIGlzIGNhcHBlZCBhdCA1MC4AAAAFbWVtZXMAAAAAAAACAAAAAAAAAAVzdGFydAAAAAAAAAQAAAAAAAAABWxpbWl0AAAAAAAABAAAAAEAAAPqAAAAEw==",
        "AAAAAAAAAAAAAAAFcGFpcnMAAAAAAAAAAAAAAQAAA+oAAAAT",
        "AAAAAAAAAONEZXBsb3lzIGEgbmV3IG1lbWVjb2luIHBhaXJlZCBhZ2FpbnN0IGBwYWlyYCBhbmQgbWludHMgaXRzIHdob2xlIHN1cHBseSBoZXJlLiBUaGUgcGFpcidzCmNyZWF0ZSBmZWUgc2VlZHMgdGhlIG1lbWUncyB2YXVsdC4gQSBwb3NpdGl2ZSBgZGV2X2J1eWAgaXMgc3BlbnQgb24gdGhlIGN1cnZlIGZvciB0aGUKY3JlYXRvciBpbiB0aGUgc2FtZSB0cmFuc2FjdGlvbiwgYmVmb3JlIGFueW9uZSBlbHNlLgAAAAAGY3JlYXRlAAAAAAAFAAAAAAAAAAdjcmVhdG9yAAAAABMAAAAAAAAABG5hbWUAAAAQAAAAAAAAAAZzeW1ib2wAAAAAABAAAAAAAAAABHBhaXIAAAATAAAAAAAAAAdkZXZfYnV5AAAAAAsAAAABAAAAEw==",
        "AAAAAAAAADFUaGUgY3VydmVzIG9mIGBtZW1lcyhzdGFydCwgbGltaXQpYCwgaW4gb25lIGNhbGwuAAAAAAAABmN1cnZlcwAAAAAAAgAAAAAAAAAFc3RhcnQAAAAAAAAEAAAAAAAAAAVsaW1pdAAAAAAAAAQAAAABAAAD6gAAB9AAAAAFQ3VydmUAAAA=",
        "AAAAAAAAAJ1TcGVuZHMgdXAgdG8gMSUgb2YgdGhlIHBvb2wncyBwYWlyIHJlc2VydmUgZnJvbSBhIG1pZ3JhdGVkIG1lbWUncyB2YXVsdCBvbiB0aGUgbWVtZSwKYW5kIGJ1cm5zIHdoYXQgaXQgYnV5cy4gQW55b25lIGNhbiBjYWxsIGl0LCBhcyBvZnRlbiBhcyB0aGUgdmF1bHQgbGFzdHMuAAAAAAAAB2J1eWJhY2sAAAAAAQAAAAAAAAAEbWVtZQAAABMAAAABAAAACw==",
        "AAAAAAAAAAAAAAAHZGl2X2JwcwAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAipTZWVkcyBhIFNvcm9zd2FwIHBvb2wgd2l0aCBhIGdyYWR1YXRlZCBtZW1lJ3MgbGFzdCAyMDBNIGFuZCBpdHMgcmVzZXJ2ZSwgYXQgdGhlIGN1cnZlJ3MKZmluYWwgcHJpY2UsIGFuZCBrZWVwcyB0aGUgTFAgc2hhcmVzIGhlcmUgZm9yIGdvb2QuIEFueW9uZSBjYW4gY2FsbCBpdC4KCkFueW9uZSBjYW4gYWxzbyBjcmVhdGUgdGhlIHBvb2wgZmlyc3QgYW5kIHNlZWQgaXQgYXQgYW5vdGhlciBwcmljZSwgd2hpY2ggd291bGQgaGFuZCB0aGUKcmVzZXJ2ZSB0byB0aGVtIHRocm91Z2ggdGhlIHBvb2wncyBzaGFyZSBtYXRoLiBTbyB3aGVuIHRoZSBwb29sIGFscmVhZHkgaG9sZHMgcmVzZXJ2ZXMsCnRoZSBsYXVuY2hwYWQgZmlyc3Qgc3dhcHMgaXQgYmFjayB0byB0aGUgY3VydmUncyBwcmljZSAoYnV5aW5nIHdoYXRldmVyIHRoZSBzZWVkZXIgbWFkZQpjaGVhcCkgYW5kIHRoZW4gZGVwb3NpdHMgaW4gdGhlIHBvb2wncyBleGFjdCBwcm9wb3J0aW9uLiBNZW1lcyBsZWZ0IG92ZXIgYXJlIGJ1cm5lZCBhbmQKcGFpciBsZWZ0IG92ZXIgZ29lcyB0byB0aGUgbWVtZSdzIHZhdWx0LgAAAAAAB21pZ3JhdGUAAAAAAQAAAAAAAAAEbWVtZQAAABMAAAABAAAAEw==",
        "AAAAAAAAADxSZXBsYWNlcyB0aGlzIGNvbnRyYWN0J3MgY29kZTsgaXRzIGFkZHJlc3MgYW5kIHN0b3JhZ2Ugc3RheS4AAAAHdXBncmFkZQAAAAABAAAAAAAAAAl3YXNtX2hhc2gAAAAAAAPuAAAAIAAAAAA=",
        "AAAAAAAAAI1BbGxvd3MgYHBhaXJgIGFzIGEgcmVzZXJ2ZSBhc3NldC4gYHZfcGFpcjBgIGlzIGl0cyB2aXJ0dWFsIHN0YXJ0aW5nIHJlc2VydmUsIGFuZApgY3JlYXRlX2ZlZWAgd2hhdCBsYXVuY2hpbmcgYSBtZW1lIG9uIGl0IGNvc3RzLCBpbiB0aGUgcGFpci4AAAAAAAAIYWRkX3BhaXIAAAADAAAAAAAAAARwYWlyAAAAEwAAAAAAAAAHdl9wYWlyMAAAAAALAAAAAAAAAApjcmVhdGVfZmVlAAAAAAALAAAAAA==",
        "AAAAAAAAAEdgdHJhZGVyYCdzIGN1cnZlIHBvc2l0aW9uIGluIGBtZW1lYCwgYWxsIHplcm9zIGlmIHRoZXkgbmV2ZXIgYm91Z2h0IGl0LgAAAAAIcG9zaXRpb24AAAACAAAAAAAAAAZ0cmFkZXIAAAAAABMAAAAAAAAABG1lbWUAAAATAAAAAQAAB9AAAAAIUG9zaXRpb24=",
        "AAAAAAAAADoobWVtZXMgb3V0LCBwYWlyIGNoYXJnZWQsIGZlZSkgZm9yIHBheWluZyB1cCB0byBgcGFpcl9pbmAuAAAAAAAJcXVvdGVfYnV5AAAAAAAAAgAAAAAAAAAEbWVtZQAAABMAAAAAAAAAB3BhaXJfaW4AAAAACwAAAAEAAAPtAAAAAwAAAAsAAAALAAAACw==",
        "AAAAAAAAAD5TZW5kcyB0aGUgY3JlYXRvcidzIGFjY3VtdWxhdGVkIDAuNSUgZmVlcywgaW4gdGhlIG1lbWUncyBwYWlyLgAAAAAACmNsYWltX2ZlZXMAAAAAAAIAAAAAAAAAB2NyZWF0b3IAAAAAEwAAAAAAAAAEbWVtZQAAABMAAAABAAAACw==",
        "AAAAAAAAAAAAAAAKbWVtZV9jb3VudAAAAAAAAAAAAAEAAAAE",
        "AAAAAAAAADUocGFpciBvdXQgYWZ0ZXIgZmVlLCBmZWUpIGZvciBzZWxsaW5nIGBhbW91bnRgIG1lbWVzLgAAAAAAAApxdW90ZV9zZWxsAAAAAAACAAAAAAAAAARtZW1lAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+0AAAACAAAACwAAAAs=",
        "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" ]),
      options
    )
  }
  public readonly fromJSON = {
    buy: this.txFromJSON<i128>,
        pair: this.txFromJSON<PairCfg>,
        sell: this.txFromJSON<i128>,
        admin: this.txFromJSON<string>,
        curve: this.txFromJSON<Curve>,
        memes: this.txFromJSON<Array<string>>,
        pairs: this.txFromJSON<Array<string>>,
        create: this.txFromJSON<string>,
        curves: this.txFromJSON<Array<Curve>>,
        buyback: this.txFromJSON<i128>,
        div_bps: this.txFromJSON<u32>,
        migrate: this.txFromJSON<string>,
        upgrade: this.txFromJSON<null>,
        add_pair: this.txFromJSON<null>,
        position: this.txFromJSON<Position>,
        quote_buy: this.txFromJSON<readonly [i128, i128, i128]>,
        claim_fees: this.txFromJSON<i128>,
        meme_count: this.txFromJSON<u32>,
        quote_sell: this.txFromJSON<readonly [i128, i128]>,
        amm_factory: this.txFromJSON<string>,
        protocol_fees: this.txFromJSON<i128>,
        set_meme_wasm: this.txFromJSON<null>,
        claim_protocol: this.txFromJSON<i128>
  }
}