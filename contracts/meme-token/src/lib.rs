#![no_std]
//! Memecoin SEP-41. The whole supply is minted to the launchpad at deploy time
//! and there is no mint entrypoint, so the supply is fixed forever.

use soroban_sdk::{contract, contractimpl, Address, Env, MuxedAddress, String};
use stellar_tokens::fungible::{burnable::FungibleBurnable, Base, FungibleToken};

#[contract]
pub struct MemeToken;

#[contractimpl]
impl MemeToken {
    pub fn __constructor(e: &Env, launchpad: Address, name: String, symbol: String, supply: i128) {
        Base::set_metadata(e, 7, name, symbol);
        Base::mint(e, &launchpad, supply);
    }
}

#[contractimpl(contracttrait)]
impl FungibleToken for MemeToken {
    type ContractType = Base;
}

#[contractimpl(contracttrait)]
impl FungibleBurnable for MemeToken {}

#[cfg(test)]
mod test;
