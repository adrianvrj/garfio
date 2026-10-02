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
  9: {message:"NothingToClaim"}
}





export type Key = {tag: "Admin", values: void} | {tag: "MemeWasm", values: void} | {tag: "MemeCount", values: void} | {tag: "Pairs", values: void} | {tag: "Memes", values: void} | {tag: "Pair", values: readonly [string]} | {tag: "Curve", values: readonly [string]} | {tag: "ProtocolFees", values: readonly [string]};


export interface Curve {
  created_at: u64;
  creator: string;
  fees_creator: i128;
  graduated: boolean;
  name: string;
  pair: string;
  real_pair: i128;
  sold: i128;
  symbol: string;
  token: string;
  v_pair: i128;
  v_token: i128;
}


export interface PairCfg {
  grad_target: i128;
  v_pair0: i128;
}

export interface Client {
  /**
   * Construct and simulate a buy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pays up to `pair_in` of the meme's pair and receives memes. If the curve has
   * fewer tokens left than requested, fills the rest and charges only for it.
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
   */
  memes: (options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a pairs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pairs: (options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a create transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deploys a new memecoin paired against `pair` and mints its whole supply here.
   */
  create: ({creator, name, symbol, pair}: {creator: string, name: string, symbol: string, pair: string}, options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a add_pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Allows `pair` as a reserve asset. `v_pair0` is its virtual starting reserve.
   */
  add_pair: ({pair, v_pair0}: {pair: string, v_pair0: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

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
   * Construct and simulate a quote_sell transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * (pair out after fee, fee) for selling `amount` memes.
   */
  quote_sell: ({meme, amount}: {meme: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<readonly [i128, i128]>>

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
        {admin, meme_wasm}: {admin: string, meme_wasm: Buffer},
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
    return ContractClient.deploy({admin, meme_wasm}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACQAAAAAAAAAOUGFpck5vdEFsbG93ZWQAAAAAAAEAAAAAAAAAClBhaXJFeGlzdHMAAAAAAAIAAAAAAAAAC1Vua25vd25NZW1lAAAAAAMAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAAEAAAAAAAAAAhTbGlwcGFnZQAAAAUAAAAAAAAACUdyYWR1YXRlZAAAAAAAAAYAAAAAAAAACk5vdENyZWF0b3IAAAAAAAcAAAAAAAAAD0ludmFsaWRNZXRhZGF0YQAAAAAIAAAAAAAAAA5Ob3RoaW5nVG9DbGFpbQAAAAAACQ==",
        "AAAAAAAAAJZQYXlzIHVwIHRvIGBwYWlyX2luYCBvZiB0aGUgbWVtZSdzIHBhaXIgYW5kIHJlY2VpdmVzIG1lbWVzLiBJZiB0aGUgY3VydmUgaGFzCmZld2VyIHRva2VucyBsZWZ0IHRoYW4gcmVxdWVzdGVkLCBmaWxscyB0aGUgcmVzdCBhbmQgY2hhcmdlcyBvbmx5IGZvciBpdC4AAAAAAANidXkAAAAABAAAAAAAAAAFYnV5ZXIAAAAAAAATAAAAAAAAAARtZW1lAAAAEwAAAAAAAAAHcGFpcl9pbgAAAAALAAAAAAAAAAdtaW5fb3V0AAAAAAsAAAABAAAACw==",
        "AAAAAAAAAAAAAAAEcGFpcgAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAB9AAAAAHUGFpckNmZwA=",
        "AAAAAAAAAEZTZWxscyBgYW1vdW50YCBtZW1lcyBiYWNrIHRvIHRoZSBjdXJ2ZSBmb3IgdGhlIHBhaXIsIG1pbnVzIHRoZSAxJSBmZWUuAAAAAAAEc2VsbAAAAAQAAAAAAAAABnNlbGxlcgAAAAAAEwAAAAAAAAAEbWVtZQAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIbWluX3BhaXIAAAALAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAFY3VydmUAAAAAAAABAAAAAAAAAARtZW1lAAAAEwAAAAEAAAfQAAAABUN1cnZlAAAA",
        "AAAAAAAAAAAAAAAFbWVtZXMAAAAAAAAAAAAAAQAAA+oAAAAT",
        "AAAAAAAAAAAAAAAFcGFpcnMAAAAAAAAAAAAAAQAAA+oAAAAT",
        "AAAAAAAAAE1EZXBsb3lzIGEgbmV3IG1lbWVjb2luIHBhaXJlZCBhZ2FpbnN0IGBwYWlyYCBhbmQgbWludHMgaXRzIHdob2xlIHN1cHBseSBoZXJlLgAAAAAAAAZjcmVhdGUAAAAAAAQAAAAAAAAAB2NyZWF0b3IAAAAAEwAAAAAAAAAEbmFtZQAAABAAAAAAAAAABnN5bWJvbAAAAAAAEAAAAAAAAAAEcGFpcgAAABMAAAABAAAAEw==",
        "AAAAAAAAAExBbGxvd3MgYHBhaXJgIGFzIGEgcmVzZXJ2ZSBhc3NldC4gYHZfcGFpcjBgIGlzIGl0cyB2aXJ0dWFsIHN0YXJ0aW5nIHJlc2VydmUuAAAACGFkZF9wYWlyAAAAAgAAAAAAAAAEcGFpcgAAABMAAAAAAAAAB3ZfcGFpcjAAAAAACwAAAAA=",
        "AAAAAAAAADoobWVtZXMgb3V0LCBwYWlyIGNoYXJnZWQsIGZlZSkgZm9yIHBheWluZyB1cCB0byBgcGFpcl9pbmAuAAAAAAAJcXVvdGVfYnV5AAAAAAAAAgAAAAAAAAAEbWVtZQAAABMAAAAAAAAAB3BhaXJfaW4AAAAACwAAAAEAAAPtAAAAAwAAAAsAAAALAAAACw==",
        "AAAAAAAAAD5TZW5kcyB0aGUgY3JlYXRvcidzIGFjY3VtdWxhdGVkIDAuNSUgZmVlcywgaW4gdGhlIG1lbWUncyBwYWlyLgAAAAAACmNsYWltX2ZlZXMAAAAAAAIAAAAAAAAAB2NyZWF0b3IAAAAAEwAAAAAAAAAEbWVtZQAAABMAAAABAAAACw==",
        "AAAAAAAAADUocGFpciBvdXQgYWZ0ZXIgZmVlLCBmZWUpIGZvciBzZWxsaW5nIGBhbW91bnRgIG1lbWVzLgAAAAAAAApxdW90ZV9zZWxsAAAAAAACAAAAAAAAAARtZW1lAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+0AAAACAAAACwAAAAs=",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJbWVtZV93YXNtAAAAAAAD7gAAACAAAAAA",
        "AAAAAAAAAAAAAAANcHJvdG9jb2xfZmVlcwAAAAAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAANc2V0X21lbWVfd2FzbQAAAAAAAAEAAAAAAAAACW1lbWVfd2FzbQAAAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAAAAAAAOY2xhaW1fcHJvdG9jb2wAAAAAAAIAAAAAAAAABHBhaXIAAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAEAAAAL",
        "AAAABQAAAAAAAAAAAAAABUNsYWltAAAAAAAAAQAAAAVjbGFpbQAAAAAAAAMAAAAAAAAAAnRvAAAAAAATAAAAAQAAAAAAAAAEcGFpcgAAABMAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAABVRyYWRlAAAAAAAAAQAAAAV0cmFkZQAAAAAAAAgAAAAAAAAABG1lbWUAAAATAAAAAQAAAAAAAAAGdHJhZGVyAAAAAAATAAAAAAAAAAAAAAAGaXNfYnV5AAAAAAABAAAAAAAAAAAAAAAIcGFpcl9hbXQAAAALAAAAAAAAAAAAAAAIbWVtZV9hbXQAAAALAAAAAAAAAAAAAAAGdl9wYWlyAAAAAAALAAAAAAAAAAAAAAAHdl90b2tlbgAAAAALAAAAAAAAAAAAAAAJcmVhbF9wYWlyAAAAAAAACwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAABkNyZWF0ZQAAAAAAAQAAAAZjcmVhdGUAAAAAAAUAAAAAAAAABG1lbWUAAAATAAAAAQAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAAAAAAAAEcGFpcgAAABMAAAAAAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAAAAAABnN5bWJvbAAAAAAAEAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACEdyYWR1YXRlAAAAAQAAAAhncmFkdWF0ZQAAAAIAAAAAAAAABG1lbWUAAAATAAAAAQAAAAAAAAAJcmVhbF9wYWlyAAAAAAAACwAAAAAAAAAC",
        "AAAAAgAAAAAAAAAAAAAAA0tleQAAAAAIAAAAAAAAAAAAAAAFQWRtaW4AAAAAAAAAAAAAAAAAAAhNZW1lV2FzbQAAAAAAAAAAAAAACU1lbWVDb3VudAAAAAAAAAAAAAAAAAAABVBhaXJzAAAAAAAAAAAAAAAAAAAFTWVtZXMAAAAAAAABAAAAAAAAAARQYWlyAAAAAQAAABMAAAABAAAAAAAAAAVDdXJ2ZQAAAAAAAAEAAAATAAAAAQAAAAAAAAAMUHJvdG9jb2xGZWVzAAAAAQAAABM=",
        "AAAAAQAAAAAAAAAAAAAABUN1cnZlAAAAAAAADAAAAAAAAAAKY3JlYXRlZF9hdAAAAAAABgAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAAAxmZWVzX2NyZWF0b3IAAAALAAAAAAAAAAlncmFkdWF0ZWQAAAAAAAABAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAEcGFpcgAAABMAAAAAAAAACXJlYWxfcGFpcgAAAAAAAAsAAAAAAAAABHNvbGQAAAALAAAAAAAAAAZzeW1ib2wAAAAAABAAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAGdl9wYWlyAAAAAAALAAAAAAAAAAd2X3Rva2VuAAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAAB1BhaXJDZmcAAAAAAgAAAAAAAAALZ3JhZF90YXJnZXQAAAAACwAAAAAAAAAHdl9wYWlyMAAAAAAL" ]),
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
        add_pair: this.txFromJSON<null>,
        quote_buy: this.txFromJSON<readonly [i128, i128, i128]>,
        claim_fees: this.txFromJSON<i128>,
        quote_sell: this.txFromJSON<readonly [i128, i128]>,
        protocol_fees: this.txFromJSON<i128>,
        set_meme_wasm: this.txFromJSON<null>,
        claim_protocol: this.txFromJSON<i128>
  }
}