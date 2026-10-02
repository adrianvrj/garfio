#![no_std]
//! Test RWA (tCETES, tUSTRY, tNVDA): a plain SEP-41 token with a public faucet,
//! so demo users need no trustline, issuer or backend to get funds.

use soroban_sdk::{contract, contractimpl, Address, Env, MuxedAddress, String};
use stellar_tokens::fungible::{burnable::FungibleBurnable, Base, FungibleToken};

#[contract]
pub struct RwaMock;

const FAUCET_AMOUNT: &str = "faucet";

#[contractimpl]
impl RwaMock {
    pub fn __constructor(e: &Env, name: String, symbol: String, faucet_amount: i128) {
        Base::set_metadata(e, 7, name, symbol);
        e.storage().instance().set(&FAUCET_AMOUNT, &faucet_amount);
    }

    /// Mints the fixed faucet amount to `to`. Testnet only.
    pub fn faucet(e: &Env, to: Address) -> i128 {
        to.require_auth();
        let amount = Self::faucet_amount(e);
        Base::mint(e, &to, amount);
        amount
    }

    pub fn faucet_amount(e: &Env) -> i128 {
        e.storage().instance().get(&FAUCET_AMOUNT).unwrap()
    }
}

#[contractimpl(contracttrait)]
impl FungibleToken for RwaMock {
    type ContractType = Base;
}

#[contractimpl(contracttrait)]
impl FungibleBurnable for RwaMock {}

#[cfg(test)]
mod test;
