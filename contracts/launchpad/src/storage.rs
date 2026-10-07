use soroban_sdk::{contracttype, Address, BytesN, Env, String, Vec};

const DAY: u32 = 17_280;
const BUMP_THRESHOLD: u32 = 30 * DAY;
const BUMP_TO: u32 = 120 * DAY;

#[contracttype]
#[derive(Clone)]
pub enum Key {
    Admin,
    MemeWasm,
    AmmFactory,
    DivBps,
    MemeCount,
    Pairs,
    /// The n-th meme ever created, so the list pages instead of living in one growing entry.
    MemeAt(u32),
    Pair(Address),
    Curve(Address),
    ProtocolFees(Address),
    Position(Address, Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PairCfg {
    pub v_pair0: i128,
    pub grad_target: i128,
    /// Paid by the creator in the pair at `create`; it seeds the meme's vault.
    pub create_fee: i128,
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
    /// Pair set aside for the meme's holders: a quarter of each fee, the create fee and the
    /// reserve the pool did not need, less the `div_bps` share that goes to `div_pending`.
    /// Once migrated, `buyback` spends it on memes and burns them.
    pub vault: i128,
    /// Pair owed to the meme's holders as dividends; `distribute` sends it to the token.
    pub div_pending: i128,
    /// Memes burned by migration leftovers and buybacks.
    pub burned: i128,
    pub created_at: u64,
    pub graduated: bool,
    /// Soroswap pair holding the liquidity once the curve has migrated.
    pub pool: Option<Address>,
}

/// What a trader bought on the curve and still holds, at average cost, in the meme's pair.
#[contracttype]
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Position {
    pub held: i128,
    pub cost: i128,
    pub realized: i128,
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

pub fn amm_factory(e: &Env) -> Address {
    e.storage().instance().get(&Key::AmmFactory).unwrap()
}

pub fn set_amm_factory(e: &Env, f: &Address) {
    e.storage().instance().set(&Key::AmmFactory, f);
}

/// Basis points of every vault inflow that go to the holders as dividends instead.
pub fn div_bps(e: &Env) -> i128 {
    e.storage().instance().get(&Key::DivBps).unwrap()
}

pub fn set_div_bps(e: &Env, bps: i128) {
    e.storage().instance().set(&Key::DivBps, &bps);
}

pub fn meme_count(e: &Env) -> u32 {
    e.storage().instance().get(&Key::MemeCount).unwrap_or(0)
}

/// Appends `meme` to the list and returns its index.
pub fn push_meme(e: &Env, meme: &Address) -> u32 {
    let n = meme_count(e);
    e.storage().instance().set(&Key::MemeCount, &(n + 1));
    set_p(e, &Key::MemeAt(n), meme);
    n
}

pub fn meme_at(e: &Env, n: u32) -> Address {
    get_p(e, &Key::MemeAt(n)).unwrap()
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

/// Positions live like the meme tokens' balances (OpenZeppelin stellar-tokens): a new one gets
/// the network's minimum TTL, and each later trade keeps it alive for 30 more days. One that
/// archives is restored, not lost, by the trader's next trade.
const POSITION_TTL: u32 = 30 * DAY;

pub fn position(e: &Env, trader: &Address, meme: &Address) -> Position {
    let k = Key::Position(trader.clone(), meme.clone());
    let p = e.storage().persistent().get(&k);
    if p.is_some() {
        e.storage().persistent().extend_ttl(&k, POSITION_TTL - DAY, POSITION_TTL);
    }
    p.unwrap_or_default()
}

pub fn set_position(e: &Env, trader: &Address, meme: &Address, p: &Position) {
    e.storage().persistent().set(&Key::Position(trader.clone(), meme.clone()), p);
}
