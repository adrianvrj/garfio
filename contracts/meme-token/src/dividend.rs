//! Spreads the meme's bond over its holders by balance, the accumulated-per-share pattern Flap
//! uses. `Acc` only grows: what a holder earned is their share times its growth since they last
//! settled. Every balance change settles both sides first, so nobody earns on memes they did not
//! hold when the bond came in.
//!
//! The accounting lives here and not in the launchpad because Soroban forbids re-entry: the
//! launchpad moves memes in `buy`, `sell`, `migrate` and `buyback`, and those transfers could not
//! call back into it.

use soroban_sdk::{
    contractclient, contracterror, contractevent, contracttype, panic_with_error, token::TokenClient, Address,
    Env,
};
use stellar_tokens::fungible::Base;

/// `Acc` is reward per share scaled by this, so small deposits over a large supply still count.
const SCALE: i128 = 1_000_000_000_000;
/// Below one whole meme of eligible shares a deposit waits in `Undistributed`. With at least one
/// meme, `share × Acc` stays far inside i128 for any reserve the curves can hold.
const MIN_TOTAL: i128 = 10_000_000;

const DAY: u32 = 17_280;
const HOLDER_TTL: u32 = 30 * DAY;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum DividendError {
    NothingToClaim = 201,
    NotAPool = 202,
    InvalidAmount = 203,
}

#[contracttype]
#[derive(Clone)]
enum Key {
    Launchpad,
    Reward,
    AmmFactory,
    Acc,
    TotalShares,
    Undistributed,
    Holder(Address),
    Excluded(Address),
}

/// A holder's share is their balance; `acc` is `Acc` when it last changed, and `pending` what
/// they had earned until then. Earnings round down per holder, so together they never exceed
/// what was deposited.
#[contracttype]
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Holder {
    pub share: i128,
    pub acc: i128,
    pub pending: i128,
}

#[contractevent(topics = ["notify"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Notify {
    pub amount: i128,
    pub acc: i128,
}

#[contractevent(topics = ["claim"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Claim {
    #[topic]
    pub holder: Address,
    pub amount: i128,
}

// Never implemented here; it only generates the client.
#[allow(dead_code)]
#[contractclient(name = "FactoryClient")]
trait Factory {
    fn pair_exists(e: Env, token_a: Address, token_b: Address) -> bool;
    fn get_pair(e: Env, token_a: Address, token_b: Address) -> Address;
}

fn inst<V: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(e: &Env, k: &Key) -> Option<V> {
    e.storage().instance().get(k)
}

fn acc(e: &Env) -> i128 {
    inst(e, &Key::Acc).unwrap_or(0)
}

pub fn total_shares(e: &Env) -> i128 {
    inst(e, &Key::TotalShares).unwrap_or(0)
}

fn undistributed(e: &Env) -> i128 {
    inst(e, &Key::Undistributed).unwrap_or(0)
}

pub fn reward(e: &Env) -> Address {
    inst(e, &Key::Reward).unwrap()
}

fn holder(e: &Env, a: &Address) -> Holder {
    let k = Key::Holder(a.clone());
    let h = e.storage().persistent().get(&k);
    if h.is_some() {
        e.storage().persistent().extend_ttl(&k, HOLDER_TTL - DAY, HOLDER_TTL);
    }
    h.unwrap_or_default()
}

fn set_holder(e: &Env, a: &Address, h: &Holder) {
    let k = Key::Holder(a.clone());
    if *h == Holder::default() {
        e.storage().persistent().remove(&k);
    } else {
        e.storage().persistent().set(&k, h);
    }
}

fn earned(h: &Holder, acc: i128) -> i128 {
    h.pending + h.share * (acc - h.acc) / SCALE
}

pub fn is_excluded(e: &Env, a: &Address) -> bool {
    e.storage().persistent().has(&Key::Excluded(a.clone()))
}

pub fn init(e: &Env, launchpad: &Address, reward: &Address, amm_factory: &Address) {
    let s = e.storage().instance();
    s.set(&Key::Launchpad, launchpad);
    s.set(&Key::Reward, reward);
    s.set(&Key::AmmFactory, amm_factory);
    exclude(e, launchpad);
    exclude(e, &e.current_contract_address());
}

/// Settles `a` and sets its share to its balance. Call it after every balance change.
pub fn sync(e: &Env, a: &Address) {
    if is_excluded(e, a) {
        return;
    }
    let acc = acc(e);
    let h = holder(e, a);
    let share = Base::balance(e, a);
    e.storage().instance().set(&Key::TotalShares, &(total_shares(e) - h.share + share));
    let pending = earned(&h, acc);
    set_holder(e, a, &Holder { share, acc: if share == 0 { 0 } else { acc }, pending });
}

/// Takes `a` out of the dividends for good. What it had earned goes back to the holders.
fn exclude(e: &Env, a: &Address) {
    if is_excluded(e, a) {
        return;
    }
    let h = holder(e, a);
    let s = e.storage().instance();
    s.set(&Key::TotalShares, &(total_shares(e) - h.share));
    s.set(&Key::Undistributed, &(undistributed(e) + earned(&h, acc(e))));
    set_holder(e, a, &Holder::default());
    e.storage().persistent().set(&Key::Excluded(a.clone()), &true);
}

/// Spreads `amount` of the reward, already sent to this contract, over the current holders.
pub fn notify(e: &Env, amount: i128) {
    inst::<Address>(e, &Key::Launchpad).unwrap().require_auth();
    if amount <= 0 {
        panic_with_error!(e, DividendError::InvalidAmount);
    }
    let pot = amount + undistributed(e);
    let total = total_shares(e);
    let s = e.storage().instance();
    let acc = if total < MIN_TOTAL {
        s.set(&Key::Undistributed, &pot);
        acc(e)
    } else {
        // what the rounding of `Acc` leaves out waits for the next deposit; it rounds up here so
        // the holders' rounded-down earnings can never add up to more than was paid in
        let step = pot * SCALE / total;
        s.set(&Key::Undistributed, &(pot - (step * total + SCALE - 1) / SCALE));
        let acc = acc(e) + step;
        s.set(&Key::Acc, &acc);
        acc
    };
    Notify { amount, acc }.publish(e);
}

pub fn claimable(e: &Env, a: &Address) -> i128 {
    earned(&holder(e, a), acc(e))
}

/// Pays `a` what it has earned. Anyone may call it: the bond only ever goes to `a`.
pub fn claim(e: &Env, a: &Address) -> i128 {
    let acc = acc(e);
    let h = holder(e, a);
    let owed = earned(&h, acc);
    if owed <= 0 {
        panic_with_error!(e, DividendError::NothingToClaim);
    }
    set_holder(e, a, &Holder { share: h.share, acc: if h.share == 0 { 0 } else { acc }, pending: 0 });
    TokenClient::new(e, &reward(e)).transfer(&e.current_contract_address(), a, &owed);
    Claim { holder: a.clone(), amount: owed }.publish(e);
    owed
}

/// Excludes this meme's Soroswap pool against `other`, so liquidity never earns dividends.
pub fn exclude_pool(e: &Env, other: &Address) -> Address {
    let factory = FactoryClient::new(e, &inst::<Address>(e, &Key::AmmFactory).unwrap());
    let this = e.current_contract_address();
    if !factory.pair_exists(&this, other) {
        panic_with_error!(e, DividendError::NotAPool);
    }
    let pool = factory.get_pair(&this, other);
    exclude(e, &pool);
    pool
}
