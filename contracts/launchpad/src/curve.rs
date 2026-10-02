//! Constant-product curve with virtual reserves (pump.fun model).
//! Every division that sets a new reserve rounds in favour of the pool.

pub const DECIMALS: i128 = 10_000_000;
pub const SUPPLY: i128 = 1_000_000_000 * DECIMALS;
pub const FOR_SALE: i128 = 800_000_000 * DECIMALS;
pub const V_TOKEN0: i128 = 1_073_000_000 * DECIMALS;
pub const FEE_BPS: i128 = 100;
const BPS: i128 = 10_000;

fn ceil_div(a: i128, b: i128) -> i128 {
    (a + b - 1) / b
}

pub fn fee(amount: i128) -> i128 {
    amount * FEE_BPS / BPS
}

/// Splits a fee into (creator, protocol). The creator never gets the odd unit.
pub fn split(fee: i128) -> (i128, i128) {
    let creator = fee / 2;
    (creator, fee - creator)
}

/// Memes out for `net` pair in, and the new (v_pair, v_token).
pub fn buy(v_pair: i128, v_token: i128, net: i128) -> (i128, i128, i128) {
    let new_vp = v_pair + net;
    let new_vt = ceil_div(v_pair * v_token, new_vp);
    (v_token - new_vt, new_vp, new_vt)
}

/// Gross pair needed (fee included) to take exactly `out` memes off the curve.
pub fn cost_of(v_pair: i128, v_token: i128, out: i128) -> i128 {
    let new_vt = v_token - out;
    let net = ceil_div(v_pair * v_token, new_vt) - v_pair;
    ceil_div(net * BPS, BPS - FEE_BPS)
}

/// Gross pair out (before fee) for `amount` memes in, and the new (v_pair, v_token).
pub fn sell(v_pair: i128, v_token: i128, amount: i128) -> (i128, i128, i128) {
    let new_vt = v_token + amount;
    let new_vp = ceil_div(v_pair * v_token, new_vt);
    (v_pair - new_vp, new_vp, new_vt)
}

/// Real pair reserve once all FOR_SALE tokens are sold: the graduation target.
pub fn grad_target(v_pair0: i128) -> i128 {
    ceil_div(v_pair0 * V_TOKEN0, V_TOKEN0 - FOR_SALE) - v_pair0
}
