#![no_std]
//! Garfio launchpad: memecoins whose bonding-curve reserve is a tokenized RWA.
//! Each meme picks its pair (tCETES, tUSTRY, tTESOURO…) from an admin allowlist. When the
//! curve sells out, anyone can migrate its reserve to a Soroswap pool with locked liquidity.
//! A quarter of every fee goes to the meme's vault. Part of it (`div_bps`) is paid to the meme's
//! holders as dividends in the pair; the rest buys the meme back and burns it.

mod amm;
mod curve;
mod events;
mod meme;
mod storage;

use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, token::TokenClient, Address, BytesN,
    Env, String, Vec,
};

pub use storage::{Curve, PairCfg, Position};
use amm::{FactoryClient, PairClient};
use meme::MemeClient;
use curve::{FOR_POOL, FOR_SALE, SUPPLY, V_TOKEN0};

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
    // 10 is left out: SEP-41 tokens use it for InsufficientBalance, and the app reads both.
    NotGraduated = 11,
    Migrated = 12,
    // 13 and 14 are left out: the Stellar asset contracts of the pairs raise them, and the app reads both.
    NotMigrated = 15,
    VaultEmpty = 16,
    NothingToDistribute = 17,
}

/// Most of a pool's pair reserve one `buyback` spends: small enough that sandwiching it costs
/// more in swap fees than it moves the price.
const BUYBACK_BPS: i128 = 100;

#[contract]
pub struct Launchpad;

fn load(e: &Env, meme: &Address) -> Curve {
    storage::curve(e, meme).unwrap_or_else(|| panic_with_error!(e, Error::UnknownMeme))
}

fn add_protocol_fee(e: &Env, pair: &Address, fee: i128) {
    storage::set_protocol_fees(e, pair, storage::protocol_fees(e, pair) + fee);
}

/// Splits pair bound for the meme's vault: `div_bps` of it is owed to the holders.
fn add_to_vault(e: &Env, c: &mut Curve, amount: i128) {
    let div = amount * storage::div_bps(e) / 10_000;
    c.div_pending += div;
    c.vault += amount - div;
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

const PAGE_MAX: u32 = 50;

fn page(e: &Env, start: u32, limit: u32) -> core::ops::Range<u32> {
    let end = storage::meme_count(e).min(start.saturating_add(limit.min(PAGE_MAX)));
    start.min(end)..end
}

/// A pool's reserves as (memes, pair), whichever order the pair keeps them in.
fn reserves(pc: &PairClient, meme: &Address) -> (i128, i128) {
    let (r0, r1) = pc.get_reserves();
    if pc.token_0() == *meme { (r0, r1) } else { (r1, r0) }
}

/// Takes `out` of the memes (or of the pair) out of a pool, for tokens already sent to it.
fn swap_to(pc: &PairClient, meme: &Address, memes_out: bool, out: i128, to: &Address) {
    let meme_is_0 = pc.token_0() == *meme;
    if memes_out == meme_is_0 {
        pc.swap(&out, &0, to);
    } else {
        pc.swap(&0, &out, to);
    }
}

/// Buys on the curve for `buyer`, whose auth the caller has already checked. If the
/// curve has fewer tokens left than requested, fills the rest and charges only for it.
fn fill_buy(e: &Env, buyer: Address, meme: Address, pair_in: i128, min_out: i128) -> i128 {
    if pair_in <= 0 {
        panic_with_error!(e, Error::InvalidAmount);
    }
    let mut c = load(e, &meme);
    if c.graduated {
        panic_with_error!(e, Error::Graduated);
    }
    let (out, charged, fee) = quote_buy_inner(&c, pair_in);
    if out <= 0 || out < min_out {
        panic_with_error!(e, Error::Slippage);
    }

    let this = e.current_contract_address();
    TokenClient::new(e, &c.pair).transfer(&buyer, &this, &charged);
    TokenClient::new(e, &meme).transfer(&this, &buyer, &out);

    let net = charged - fee;
    let (fee_c, fee_v, fee_p) = curve::split(fee);
    c.v_pair += net;
    c.v_token -= out;
    c.real_pair += net;
    c.sold += out;
    c.fees_creator += fee_c;
    add_to_vault(e, &mut c, fee_v);
    add_protocol_fee(e, &c.pair, fee_p);
    if c.sold == FOR_SALE {
        c.graduated = true;
    }
    storage::set_curve(e, &meme, &c);
    storage::bump_instance(e);
    let mut p = storage::position(e, &buyer, &meme);
    p.held += out;
    p.cost += charged;
    storage::set_position(e, &buyer, &meme, &p);

    events::Trade {
        meme: meme.clone(),
        trader: buyer,
        is_buy: true,
        pair_amt: charged,
        meme_amt: out,
        v_pair: c.v_pair,
        v_token: c.v_token,
        real_pair: c.real_pair,
        at: e.ledger().timestamp(),
    }
    .publish(e);
    if c.graduated {
        events::Graduate { meme, real_pair: c.real_pair }.publish(e);
    }
    out
}

/// Takes the part of a sale of `amount` for `out` that the curve sold to `seller` off their
/// position, at average cost. Tokens they got any other way have no known cost, so their
/// share of `out` is not counted as realized.
fn close_position(e: &Env, seller: &Address, meme: &Address, amount: i128, out: i128) {
    let mut p = storage::position(e, seller, meme);
    let t = amount.min(p.held);
    if t == 0 {
        return;
    }
    let basis = p.cost * t / p.held;
    p.held -= t;
    p.cost = if p.held == 0 { 0 } else { p.cost - basis };
    p.realized += out * t / amount - basis;
    storage::set_position(e, seller, meme, &p);
}

#[contractimpl]
impl Launchpad {
    /// `div_bps` is the part of every vault inflow paid to the meme's holders as dividends.
    pub fn __constructor(e: Env, admin: Address, meme_wasm: BytesN<32>, amm_factory: Address, div_bps: u32) {
        if div_bps > 10_000 {
            panic_with_error!(&e, Error::InvalidAmount);
        }
        storage::set_admin(&e, &admin);
        storage::set_meme_wasm(&e, &meme_wasm);
        storage::set_amm_factory(&e, &amm_factory);
        storage::set_div_bps(&e, div_bps as i128);
    }

    // ---------- admin ----------

    /// Allows `pair` as a reserve asset. `v_pair0` is its virtual starting reserve, and
    /// `create_fee` what launching a meme on it costs, in the pair.
    pub fn add_pair(e: Env, pair: Address, v_pair0: i128, create_fee: i128) {
        storage::admin(&e).require_auth();
        if v_pair0 <= 0 || create_fee < 0 {
            panic_with_error!(&e, Error::InvalidAmount);
        }
        if storage::pair(&e, &pair).is_some() {
            panic_with_error!(&e, Error::PairExists);
        }
        let cfg = PairCfg { v_pair0, grad_target: curve::grad_target(v_pair0), create_fee };
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

    /// Replaces this contract's code; its address and storage stay.
    pub fn upgrade(e: Env, wasm_hash: BytesN<32>) {
        storage::admin(&e).require_auth();
        e.deployer().update_current_contract_wasm(wasm_hash);
    }

    // ---------- users ----------

    /// Deploys a new memecoin paired against `pair` and mints its whole supply here. The pair's
    /// create fee seeds the meme's vault. A positive `dev_buy` is spent on the curve for the
    /// creator in the same transaction, before anyone else.
    pub fn create(e: Env, creator: Address, name: String, symbol: String, pair: Address, dev_buy: i128) -> Address {
        creator.require_auth();
        if name.is_empty() || name.len() > 32 || symbol.is_empty() || symbol.len() > 12 {
            panic_with_error!(&e, Error::InvalidMetadata);
        }
        let cfg = storage::pair(&e, &pair).unwrap_or_else(|| panic_with_error!(&e, Error::PairNotAllowed));

        let id = storage::meme_count(&e);
        let mut seed = [0u8; 32];
        seed[28..].copy_from_slice(&id.to_be_bytes());
        let salt: BytesN<32> = e.crypto().sha256(&soroban_sdk::Bytes::from_array(&e, &seed)).into();
        let this = e.current_contract_address();
        if cfg.create_fee > 0 {
            TokenClient::new(&e, &pair).transfer(&creator, &this, &cfg.create_fee);
        }
        let token = e
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(
                storage::meme_wasm(&e),
                (this, name.clone(), symbol.clone(), SUPPLY, pair.clone(), storage::amm_factory(&e)),
            );

        let mut c = Curve {
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
            vault: 0,
            div_pending: 0,
            burned: 0,
            created_at: e.ledger().timestamp(),
            graduated: false,
            pool: None,
        };
        add_to_vault(&e, &mut c, cfg.create_fee);
        storage::set_curve(&e, &token, &c);
        storage::push_meme(&e, &token);
        storage::bump_instance(&e);

        events::Create { meme: token.clone(), creator: creator.clone(), pair, name, symbol }.publish(&e);
        if dev_buy > 0 {
            fill_buy(&e, creator, token.clone(), dev_buy, 0);
        }
        token
    }

    /// Pays up to `pair_in` of the meme's pair and receives memes.
    pub fn buy(e: Env, buyer: Address, meme: Address, pair_in: i128, min_out: i128) -> i128 {
        buyer.require_auth();
        fill_buy(&e, buyer, meme, pair_in, min_out)
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

        let (fee_c, fee_v, fee_p) = curve::split(fee);
        c.v_pair = new_vp;
        c.v_token = new_vt;
        c.real_pair -= gross;
        c.sold -= amount;
        c.fees_creator += fee_c;
        add_to_vault(&e, &mut c, fee_v);
        add_protocol_fee(&e, &c.pair, fee_p);
        storage::set_curve(&e, &meme, &c);
        storage::bump_instance(&e);
        close_position(&e, &seller, &meme, amount, out);

        events::Trade {
            meme,
            trader: seller,
            is_buy: false,
            pair_amt: out,
            meme_amt: amount,
            v_pair: c.v_pair,
            v_token: c.v_token,
            real_pair: c.real_pair,
            at: e.ledger().timestamp(),
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

    /// Seeds a Soroswap pool with a graduated meme's last 200M and its reserve, at the curve's
    /// final price, and keeps the LP shares here for good. Anyone can call it.
    ///
    /// Anyone can also create the pool first and seed it at another price, which would hand the
    /// reserve to them through the pool's share math. So when the pool already holds reserves,
    /// the launchpad first swaps it back to the curve's price (buying whatever the seeder made
    /// cheap) and then deposits in the pool's exact proportion. Memes left over are burned and
    /// pair left over goes to the meme's vault.
    pub fn migrate(e: Env, meme: Address) -> Address {
        let mut c = load(&e, &meme);
        if !c.graduated {
            panic_with_error!(&e, Error::NotGraduated);
        }
        if c.pool.is_some() {
            panic_with_error!(&e, Error::Migrated);
        }

        let factory = FactoryClient::new(&e, &storage::amm_factory(&e));
        let pool = if factory.pair_exists(&meme, &c.pair) {
            factory.get_pair(&meme, &c.pair)
        } else {
            factory.create_pair(&meme, &c.pair)
        };
        // the pool holds memes from here on and must not earn dividends on them
        MemeClient::new(&e, &meme).exclude_pool(&c.pair);
        let this = e.current_contract_address();
        let pc = PairClient::new(&e, &pool);
        let memes = TokenClient::new(&e, &meme);
        let pair = TokenClient::new(&e, &c.pair);
        let (mut meme_left, mut pair_left) = (FOR_POOL, c.real_pair);

        let (r_meme, r_pair) = reserves(&pc, &meme);
        let mut rebalanced = 0;
        let (meme_amt, pair_amt) = if r_meme == 0 || r_pair == 0 {
            (FOR_POOL, curve::pool_pair(c.v_pair, c.v_token, FOR_POOL).min(c.real_pair))
        } else {
            if let Some((meme_in, wanted, _)) = curve::rebalance(r_meme, r_pair, c.v_pair, c.v_token) {
                // A pool skewed beyond what the launchpad can move gets at most half of what it
                // holds: that half already sells above the curve's price, and the rest still
                // goes in as liquidity.
                let (have, r_in, r_out) =
                    if meme_in { (meme_left, r_meme, r_pair) } else { (pair_left, r_pair, r_meme) };
                let amount_in = wanted.min(have / 2);
                let out = curve::amount_out(amount_in, r_in, r_out);
                if out > 0 {
                    let token_in = if meme_in { &memes } else { &pair };
                    token_in.transfer(&this, &pool, &amount_in);
                    swap_to(&pc, &meme, !meme_in, out, &this);
                    if meme_in {
                        meme_left = meme_left - amount_in;
                        pair_left += out;
                    } else {
                        pair_left -= amount_in;
                        meme_left += out;
                    }
                    rebalanced = amount_in;
                }
            }
            let (r_meme, r_pair) = reserves(&pc, &meme);
            let m = meme_left.min(pair_left * r_meme / r_pair);
            (m, m * r_pair / r_meme)
        };

        memes.transfer(&this, &pool, &meme_amt);
        pair.transfer(&this, &pool, &pair_amt);
        pc.deposit(&this);

        let burn = meme_left - meme_amt;
        if burn > 0 {
            memes.burn(&this, &burn);
            c.burned += burn;
        }
        add_to_vault(&e, &mut c, pair_left - pair_amt);
        c.real_pair = 0;
        c.pool = Some(pool.clone());
        storage::set_curve(&e, &meme, &c);
        storage::bump_instance(&e);

        events::Migrate { meme, pool: pool.clone(), pair_amt, meme_amt, rebalanced }.publish(&e);
        pool
    }

    /// Spends up to 1% of the pool's pair reserve from a migrated meme's vault on the meme,
    /// and burns what it buys. Anyone can call it, as often as the vault lasts.
    pub fn buyback(e: Env, meme: Address) -> i128 {
        let mut c = load(&e, &meme);
        let pool = c.pool.clone().unwrap_or_else(|| panic_with_error!(&e, Error::NotMigrated));
        let pc = PairClient::new(&e, &pool);
        let (r_meme, r_pair) = reserves(&pc, &meme);
        let amount = c.vault.min(r_pair * BUYBACK_BPS / 10_000);
        let out = curve::amount_out(amount, r_pair, r_meme);
        if amount <= 0 || out <= 0 {
            panic_with_error!(&e, Error::VaultEmpty);
        }

        let this = e.current_contract_address();
        TokenClient::new(&e, &c.pair).transfer(&this, &pool, &amount);
        swap_to(&pc, &meme, true, out, &this);
        TokenClient::new(&e, &meme).burn(&this, &out);

        c.vault -= amount;
        c.burned += out;
        storage::set_curve(&e, &meme, &c);
        storage::bump_instance(&e);
        events::Buyback { meme, pair_amt: amount, burned: out }.publish(&e);
        out
    }

    /// Sends the meme's pending dividends to its token, which spreads them over the holders.
    /// Anyone can call it.
    pub fn distribute(e: Env, meme: Address) -> i128 {
        let mut c = load(&e, &meme);
        let amount = c.div_pending;
        if amount <= 0 {
            panic_with_error!(&e, Error::NothingToDistribute);
        }
        c.div_pending = 0;
        storage::set_curve(&e, &meme, &c);
        storage::bump_instance(&e);
        TokenClient::new(&e, &c.pair).transfer(&e.current_contract_address(), &meme, &amount);
        MemeClient::new(&e, &meme).notify(&amount);
        events::Distribute { meme, pair_amt: amount }.publish(&e);
        amount
    }

    // ---------- views ----------

    pub fn div_bps(e: Env) -> u32 {
        storage::div_bps(&e) as u32
    }

    pub fn amm_factory(e: Env) -> Address {
        storage::amm_factory(&e)
    }

    pub fn admin(e: Env) -> Address {
        storage::admin(&e)
    }

    pub fn pairs(e: Env) -> Vec<Address> {
        storage::pairs(&e)
    }

    pub fn pair(e: Env, pair: Address) -> PairCfg {
        storage::pair(&e, &pair).unwrap_or_else(|| panic_with_error!(&e, Error::PairNotAllowed))
    }

    pub fn meme_count(e: Env) -> u32 {
        storage::meme_count(&e)
    }

    /// Memes `start..start + limit` in creation order; `limit` is capped at 50.
    pub fn memes(e: Env, start: u32, limit: u32) -> Vec<Address> {
        let mut out = Vec::new(&e);
        for n in page(&e, start, limit) {
            out.push_back(storage::meme_at(&e, n));
        }
        out
    }

    /// The curves of `memes(start, limit)`, in one call.
    pub fn curves(e: Env, start: u32, limit: u32) -> Vec<Curve> {
        let mut out = Vec::new(&e);
        for n in page(&e, start, limit) {
            out.push_back(load(&e, &storage::meme_at(&e, n)));
        }
        out
    }

    pub fn curve(e: Env, meme: Address) -> Curve {
        load(&e, &meme)
    }

    pub fn protocol_fees(e: Env, pair: Address) -> i128 {
        storage::protocol_fees(&e, &pair)
    }

    /// `trader`'s curve position in `meme`, all zeros if they never bought it.
    pub fn position(e: Env, trader: Address, meme: Address) -> Position {
        storage::position(&e, &trader, &meme)
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
