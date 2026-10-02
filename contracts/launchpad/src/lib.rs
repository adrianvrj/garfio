#![no_std]
//! Garfio launchpad: memecoins whose bonding-curve reserve is a tokenized RWA.
//! Each meme picks its pair (tCETES, tUSTRY, tNVDA…) from an admin allowlist.

mod curve;
mod events;
mod storage;

use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, token::TokenClient, Address, BytesN,
    Env, String, Vec,
};

pub use storage::{Curve, PairCfg};
use curve::{FOR_SALE, SUPPLY, V_TOKEN0};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    PairNotAllowed = 1,
    PairExists = 2,
    UnknownMeme = 3,
    InvalidAmount = 4,
    Slippage = 5,
    Graduated = 6,
    NotCreator = 7,
    InvalidMetadata = 8,
    NothingToClaim = 9,
}

#[contract]
pub struct Launchpad;

fn load(e: &Env, meme: &Address) -> Curve {
    storage::curve(e, meme).unwrap_or_else(|| panic_with_error!(e, Error::UnknownMeme))
}

fn add_protocol_fee(e: &Env, pair: &Address, fee: i128) {
    storage::set_protocol_fees(e, pair, storage::protocol_fees(e, pair) + fee);
}

/// (memes out, pair actually charged, fee). Caps the fill at what is left for sale.
fn quote_buy_inner(c: &Curve, pair_in: i128) -> (i128, i128, i128) {
    let fee = curve::fee(pair_in);
    let (out, _, _) = curve::buy(c.v_pair, c.v_token, pair_in - fee);
    let left = FOR_SALE - c.sold;
    if out <= left {
        return (out, pair_in, fee);
    }
    let cost = curve::cost_of(c.v_pair, c.v_token, left);
    (left, cost, curve::fee(cost))
}

#[contractimpl]
impl Launchpad {
    pub fn __constructor(e: Env, admin: Address, meme_wasm: BytesN<32>) {
        storage::set_admin(&e, &admin);
        storage::set_meme_wasm(&e, &meme_wasm);
    }

    // ---------- admin ----------

    /// Allows `pair` as a reserve asset. `v_pair0` is its virtual starting reserve.
    pub fn add_pair(e: Env, pair: Address, v_pair0: i128) {
        storage::admin(&e).require_auth();
        if v_pair0 <= 0 {
            panic_with_error!(&e, Error::InvalidAmount);
        }
        if storage::pair(&e, &pair).is_some() {
            panic_with_error!(&e, Error::PairExists);
        }
        let cfg = PairCfg { v_pair0, grad_target: curve::grad_target(v_pair0) };
        storage::set_pair(&e, &pair, &cfg);
        let mut all = storage::pairs(&e);
        all.push_back(pair);
        storage::set_pairs(&e, &all);
        storage::bump_instance(&e);
    }

    pub fn claim_protocol(e: Env, pair: Address, to: Address) -> i128 {
        storage::admin(&e).require_auth();
        let amount = storage::protocol_fees(&e, &pair);
        if amount == 0 {
            panic_with_error!(&e, Error::NothingToClaim);
        }
        storage::set_protocol_fees(&e, &pair, 0);
        TokenClient::new(&e, &pair).transfer(&e.current_contract_address(), &to, &amount);
        events::Claim { to, pair, amount }.publish(&e);
        amount
    }

    pub fn set_meme_wasm(e: Env, meme_wasm: BytesN<32>) {
        storage::admin(&e).require_auth();
        storage::set_meme_wasm(&e, &meme_wasm);
    }

    // ---------- users ----------

    /// Deploys a new memecoin paired against `pair` and mints its whole supply here.
    pub fn create(e: Env, creator: Address, name: String, symbol: String, pair: Address) -> Address {
        creator.require_auth();
        if name.is_empty() || name.len() > 32 || symbol.is_empty() || symbol.len() > 12 {
            panic_with_error!(&e, Error::InvalidMetadata);
        }
        let cfg = storage::pair(&e, &pair).unwrap_or_else(|| panic_with_error!(&e, Error::PairNotAllowed));

        let id = storage::next_meme_id(&e);
        let mut seed = [0u8; 32];
        seed[28..].copy_from_slice(&id.to_be_bytes());
        let salt: BytesN<32> = e.crypto().sha256(&soroban_sdk::Bytes::from_array(&e, &seed)).into();
        let this = e.current_contract_address();
        let token = e
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(storage::meme_wasm(&e), (this, name.clone(), symbol.clone(), SUPPLY));

        let c = Curve {
            token: token.clone(),
            pair: pair.clone(),
            creator: creator.clone(),
            name: name.clone(),
            symbol: symbol.clone(),
            v_pair: cfg.v_pair0,
            v_token: V_TOKEN0,
            real_pair: 0,
            sold: 0,
            fees_creator: 0,
            created_at: e.ledger().timestamp(),
            graduated: false,
        };
        storage::set_curve(&e, &token, &c);
        let mut all = storage::memes(&e);
        all.push_back(token.clone());
        storage::set_memes(&e, &all);
        storage::bump_instance(&e);

        events::Create { meme: token.clone(), creator, pair, name, symbol }.publish(&e);
        token
    }

    /// Pays up to `pair_in` of the meme's pair and receives memes. If the curve has
    /// fewer tokens left than requested, fills the rest and charges only for it.
    pub fn buy(e: Env, buyer: Address, meme: Address, pair_in: i128, min_out: i128) -> i128 {
        buyer.require_auth();
        if pair_in <= 0 {
            panic_with_error!(&e, Error::InvalidAmount);
        }
        let mut c = load(&e, &meme);
        if c.graduated {
            panic_with_error!(&e, Error::Graduated);
        }
        let (out, charged, fee) = quote_buy_inner(&c, pair_in);
        if out <= 0 || out < min_out {
            panic_with_error!(&e, Error::Slippage);
        }

        let this = e.current_contract_address();
        TokenClient::new(&e, &c.pair).transfer(&buyer, &this, &charged);
        TokenClient::new(&e, &meme).transfer(&this, &buyer, &out);

        let net = charged - fee;
        let (fee_c, fee_p) = curve::split(fee);
        c.v_pair += net;
        c.v_token -= out;
        c.real_pair += net;
        c.sold += out;
        c.fees_creator += fee_c;
        add_protocol_fee(&e, &c.pair, fee_p);
        if c.sold == FOR_SALE {
            c.graduated = true;
        }
        storage::set_curve(&e, &meme, &c);
        storage::bump_instance(&e);

        events::Trade {
            meme: meme.clone(),
            trader: buyer,
            is_buy: true,
            pair_amt: charged,
            meme_amt: out,
            v_pair: c.v_pair,
            v_token: c.v_token,
            real_pair: c.real_pair,
        }
        .publish(&e);
        if c.graduated {
            events::Graduate { meme, real_pair: c.real_pair }.publish(&e);
        }
        out
    }

    /// Sells `amount` memes back to the curve for the pair, minus the 1% fee.
    pub fn sell(e: Env, seller: Address, meme: Address, amount: i128, min_pair: i128) -> i128 {
        seller.require_auth();
        if amount <= 0 {
            panic_with_error!(&e, Error::InvalidAmount);
        }
        let mut c = load(&e, &meme);
        if c.graduated {
            panic_with_error!(&e, Error::Graduated);
        }
        let (gross, new_vp, new_vt) = curve::sell(c.v_pair, c.v_token, amount);
        let fee = curve::fee(gross);
        let out = gross - fee;
        if gross > c.real_pair || amount > c.sold {
            panic_with_error!(&e, Error::InvalidAmount);
        }
        if out <= 0 || out < min_pair {
            panic_with_error!(&e, Error::Slippage);
        }

        let this = e.current_contract_address();
        TokenClient::new(&e, &meme).transfer(&seller, &this, &amount);
        TokenClient::new(&e, &c.pair).transfer(&this, &seller, &out);

        let (fee_c, fee_p) = curve::split(fee);
        c.v_pair = new_vp;
        c.v_token = new_vt;
        c.real_pair -= gross;
        c.sold -= amount;
        c.fees_creator += fee_c;
        add_protocol_fee(&e, &c.pair, fee_p);
        storage::set_curve(&e, &meme, &c);
        storage::bump_instance(&e);

        events::Trade {
            meme,
            trader: seller,
            is_buy: false,
            pair_amt: out,
            meme_amt: amount,
            v_pair: c.v_pair,
            v_token: c.v_token,
            real_pair: c.real_pair,
        }
        .publish(&e);
        out
    }

    /// Sends the creator's accumulated 0.5% fees, in the meme's pair.
    pub fn claim_fees(e: Env, creator: Address, meme: Address) -> i128 {
        creator.require_auth();
        let mut c = load(&e, &meme);
        if c.creator != creator {
            panic_with_error!(&e, Error::NotCreator);
        }
        let amount = c.fees_creator;
        if amount == 0 {
            panic_with_error!(&e, Error::NothingToClaim);
        }
        c.fees_creator = 0;
        storage::set_curve(&e, &meme, &c);
        TokenClient::new(&e, &c.pair).transfer(&e.current_contract_address(), &creator, &amount);
        events::Claim { to: creator, pair: c.pair, amount }.publish(&e);
        amount
    }

    // ---------- views ----------

    pub fn admin(e: Env) -> Address {
        storage::admin(&e)
    }

    pub fn pairs(e: Env) -> Vec<Address> {
        storage::pairs(&e)
    }

    pub fn pair(e: Env, pair: Address) -> PairCfg {
        storage::pair(&e, &pair).unwrap_or_else(|| panic_with_error!(&e, Error::PairNotAllowed))
    }

    pub fn memes(e: Env) -> Vec<Address> {
        storage::memes(&e)
    }

    pub fn curve(e: Env, meme: Address) -> Curve {
        load(&e, &meme)
    }

    pub fn protocol_fees(e: Env, pair: Address) -> i128 {
        storage::protocol_fees(&e, &pair)
    }

    /// (memes out, pair charged, fee) for paying up to `pair_in`.
    pub fn quote_buy(e: Env, meme: Address, pair_in: i128) -> (i128, i128, i128) {
        quote_buy_inner(&load(&e, &meme), pair_in)
    }

    /// (pair out after fee, fee) for selling `amount` memes.
    pub fn quote_sell(e: Env, meme: Address, amount: i128) -> (i128, i128) {
        let c = load(&e, &meme);
        let (gross, _, _) = curve::sell(c.v_pair, c.v_token, amount);
        let fee = curve::fee(gross);
        (gross - fee, fee)
    }
}

#[cfg(test)]
mod test;
