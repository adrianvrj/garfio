#![no_std]
//! Memecoin SEP-41. The whole supply is minted to the launchpad at deploy time
//! and there is no mint entrypoint, so the supply is fixed forever.
//!
//! Holders earn the meme's bond (`dividend.rs`): the launchpad sends part of the fees here and
//! `notify` spreads it by balance. The launchpad, this contract and the meme's Soroswap pools
//! hold no share.

mod dividend;

use soroban_sdk::{contract, contractimpl, Address, Env, MuxedAddress, String};
use stellar_tokens::fungible::{burnable::FungibleBurnable, Base, FungibleToken};

pub use dividend::{DividendError, Holder};

#[contract]
pub struct MemeToken;

#[contractimpl]
impl MemeToken {
    /// `reward` is the meme's bond, the asset dividends are paid in; `amm_factory` is Soroswap's
    /// factory, which `exclude_pool` asks whether an address is one of this meme's pools.
    pub fn __constructor(
        e: &Env,
        launchpad: Address,
        name: String,
        symbol: String,
        supply: i128,
        reward: Address,
        amm_factory: Address,
    ) {
        Base::set_metadata(e, 7, name, symbol);
        dividend::init(e, &launchpad, &reward, &amm_factory);
        Base::mint(e, &launchpad, supply);
    }

    /// Spreads `amount` of the reward, already sent here, over the holders. Launchpad only.
    pub fn notify(e: &Env, amount: i128) {
        dividend::notify(e, amount);
    }

    /// Pays `holder` its dividends. Anyone may call it; the reward only goes to `holder`.
    pub fn claim(e: &Env, holder: Address) -> i128 {
        dividend::claim(e, &holder)
    }

    pub fn claimable(e: &Env, holder: Address) -> i128 {
        dividend::claimable(e, &holder)
    }

    /// Excludes this meme's Soroswap pool against `other` from dividends. Anyone may call it.
    pub fn exclude_pool(e: &Env, other: Address) -> Address {
        dividend::exclude_pool(e, &other)
    }

    pub fn is_excluded(e: &Env, account: Address) -> bool {
        dividend::is_excluded(e, &account)
    }

    pub fn reward(e: &Env) -> Address {
        dividend::reward(e)
    }

    pub fn total_shares(e: &Env) -> i128 {
        dividend::total_shares(e)
    }
}

#[contractimpl(contracttrait)]
impl FungibleToken for MemeToken {
    type ContractType = Base;

    fn transfer(e: &Env, from: Address, to: MuxedAddress, amount: i128) {
        Base::transfer(e, &from, &to, amount);
        dividend::sync(e, &from);
        dividend::sync(e, &to.address());
    }

    fn transfer_from(e: &Env, spender: Address, from: Address, to: Address, amount: i128) {
        Base::transfer_from(e, &spender, &from, &to, amount);
        dividend::sync(e, &from);
        dividend::sync(e, &to);
    }
}

#[contractimpl(contracttrait)]
impl FungibleBurnable for MemeToken {
    fn burn(e: &Env, from: Address, amount: i128) {
        Base::burn(e, &from, amount);
        dividend::sync(e, &from);
    }

    fn burn_from(e: &Env, spender: Address, from: Address, amount: i128) {
        Base::burn_from(e, &spender, &from, amount);
        dividend::sync(e, &from);
    }
}

#[cfg(test)]
mod test;
