//! The meme token's dividend entrypoints (contracts/meme-token).

// The trait is never implemented here; it only generates the client.
#![allow(dead_code)]

use soroban_sdk::{contractclient, Address, Env};

#[contractclient(name = "MemeClient")]
pub trait Meme {
    /// Spreads `amount` of the pair, already sent to the token, over the meme's holders.
    fn notify(e: Env, amount: i128);
    /// Excludes the meme's Soroswap pool against `other` from dividends.
    fn exclude_pool(e: Env, other: Address) -> Address;
}
