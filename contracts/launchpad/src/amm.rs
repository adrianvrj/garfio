//! The slice of Soroswap (a Uniswap V2 port) used at graduation and for buybacks. Liquidity
//! goes in the V2 way, by transferring tokens to the pair and calling `deposit` or `swap`, so
//! no router auth is needed and a pair someone created first cannot block the migration.

// The traits are never implemented here; they only generate the clients.
#![allow(dead_code)]

use soroban_sdk::{contractclient, Address, Env};

#[contractclient(name = "FactoryClient")]
pub trait Factory {
    fn pair_exists(e: Env, token_a: Address, token_b: Address) -> bool;
    fn create_pair(e: Env, token_a: Address, token_b: Address) -> Address;
    fn get_pair(e: Env, token_a: Address, token_b: Address) -> Address;
}

#[contractclient(name = "PairClient")]
pub trait Pair {
    /// Mints LP shares to `to` for the tokens sent to the pair since the last sync.
    fn deposit(e: Env, to: Address) -> i128;
    /// Pays out the amounts to `to` for the tokens sent to the pair since the last sync.
    fn swap(e: Env, amount_0_out: i128, amount_1_out: i128, to: Address);
    fn get_reserves(e: Env) -> (i128, i128);
    fn token_0(e: Env) -> Address;
}
