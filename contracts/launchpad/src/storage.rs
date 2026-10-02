use soroban_sdk::{contracttype, Address, BytesN, Env, String, Vec};

const DAY: u32 = 17_280;
const BUMP_THRESHOLD: u32 = 30 * DAY;
const BUMP_TO: u32 = 120 * DAY;

#[contracttype]
#[derive(Clone)]
pub enum Key {
    Admin,
    MemeWasm,
    MemeCount,
    Pairs,
    Memes,
    Pair(Address),
    Curve(Address),
    ProtocolFees(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PairCfg {
    pub v_pair0: i128,
    pub grad_target: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Curve {
    pub token: Address,
    pub pair: Address,
    pub creator: Address,
    pub name: String,
    pub symbol: String,
    pub v_pair: i128,
    pub v_token: i128,
    pub real_pair: i128,
    pub sold: i128,
    pub fees_creator: i128,
    pub created_at: u64,
    pub graduated: bool,
}

pub fn bump_instance(e: &Env) {
    e.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);
}

fn get_p<V: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(e: &Env, k: &Key) -> Option<V> {
    let v = e.storage().persistent().get(k);
    if v.is_some() {
        e.storage().persistent().extend_ttl(k, BUMP_THRESHOLD, BUMP_TO);
    }
    v
}

fn set_p<V: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(e: &Env, k: &Key, v: &V) {
    e.storage().persistent().set(k, v);
    e.storage().persistent().extend_ttl(k, BUMP_THRESHOLD, BUMP_TO);
}

pub fn admin(e: &Env) -> Address {
    e.storage().instance().get(&Key::Admin).unwrap()
}

pub fn set_admin(e: &Env, a: &Address) {
    e.storage().instance().set(&Key::Admin, a);
}

pub fn meme_wasm(e: &Env) -> BytesN<32> {
    e.storage().instance().get(&Key::MemeWasm).unwrap()
}

pub fn set_meme_wasm(e: &Env, h: &BytesN<32>) {
    e.storage().instance().set(&Key::MemeWasm, h);
}

pub fn next_meme_id(e: &Env) -> u32 {
    let n: u32 = e.storage().instance().get(&Key::MemeCount).unwrap_or(0);
    e.storage().instance().set(&Key::MemeCount, &(n + 1));
    n
}

pub fn pairs(e: &Env) -> Vec<Address> {
    get_p(e, &Key::Pairs).unwrap_or(Vec::new(e))
}

pub fn set_pairs(e: &Env, v: &Vec<Address>) {
    set_p(e, &Key::Pairs, v);
}

pub fn pair(e: &Env, a: &Address) -> Option<PairCfg> {
    get_p(e, &Key::Pair(a.clone()))
}

pub fn set_pair(e: &Env, a: &Address, c: &PairCfg) {
    set_p(e, &Key::Pair(a.clone()), c);
}

pub fn memes(e: &Env) -> Vec<Address> {
    get_p(e, &Key::Memes).unwrap_or(Vec::new(e))
}

pub fn set_memes(e: &Env, v: &Vec<Address>) {
    set_p(e, &Key::Memes, v);
}

pub fn curve(e: &Env, meme: &Address) -> Option<Curve> {
    get_p(e, &Key::Curve(meme.clone()))
}

pub fn set_curve(e: &Env, meme: &Address, c: &Curve) {
    set_p(e, &Key::Curve(meme.clone()), c);
}

pub fn protocol_fees(e: &Env, pair: &Address) -> i128 {
    get_p(e, &Key::ProtocolFees(pair.clone())).unwrap_or(0)
}

pub fn set_protocol_fees(e: &Env, pair: &Address, v: i128) {
    set_p(e, &Key::ProtocolFees(pair.clone()), &v);
}
