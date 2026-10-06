//! Constant-product curve with virtual reserves (pump.fun model).
//! Every division that sets a new reserve rounds in favour of the pool.

pub const DECIMALS: i128 = 10_000_000;
pub const SUPPLY: i128 = 1_000_000_000 * DECIMALS;
pub const FOR_SALE: i128 = 800_000_000 * DECIMALS;
/// What the curve keeps back to seed the AMM pool at graduation.
pub const FOR_POOL: i128 = SUPPLY - FOR_SALE;
pub const V_TOKEN0: i128 = 1_073_000_000 * DECIMALS;
pub const FEE_BPS: i128 = 100;
const BPS: i128 = 10_000;

fn ceil_div(a: i128, b: i128) -> i128 {
    (a + b - 1) / b
}

pub fn fee(amount: i128) -> i128 {
    amount * FEE_BPS / BPS
}

/// Splits a fee into (creator, vault, protocol): half, a quarter, a quarter. The protocol
/// takes the rounding.
pub fn split(fee: i128) -> (i128, i128, i128) {
    let creator = fee / 2;
    let vault = fee / 4;
    (creator, vault, fee - creator - vault)
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

/// Pair to pair with `memes` so the pool opens at the curve's last price.
pub fn pool_pair(v_pair: i128, v_token: i128, memes: i128) -> i128 {
    memes * v_pair / v_token
}

// ---------- Soroswap (Uniswap V2) math ----------

/// Soroswap's swap fee: 3 per 1000 of the input, rounded up.
const AMM_FEE: i128 = 3;
const AMM_BASE: i128 = 1000;

pub fn isqrt(n: i128) -> i128 {
    if n < 2 {
        return n.max(0);
    }
    let mut x = 1i128 << ((128 - n.leading_zeros()) / 2 + 1);
    loop {
        let y = (x + n / x) / 2;
        if y >= x {
            return x;
        }
        x = y;
    }
}

/// The most a pair pays out for `amount_in`, as its `swap` checks it:
/// (r_in + in − ⌈3·in/1000⌉) · (r_out − out) ≥ r_in · r_out.
pub fn amount_out(amount_in: i128, r_in: i128, r_out: i128) -> i128 {
    let net = amount_in - ceil_div(amount_in * AMM_FEE, AMM_BASE);
    if net <= 0 {
        return 0;
    }
    r_out - ceil_div(r_in * r_out, r_in + net)
}

/// Gross input whose net (after Soroswap's fee) is at least `net`.
fn gross_in(net: i128) -> i128 {
    ceil_div(net * AMM_BASE, AMM_BASE - AMM_FEE) + 1
}

/// The swap that moves a pool holding (`r_meme`, `r_pair`) to the curve's price
/// v_pair / v_token: (meme_in, amount_in, amount_out), or None if it is already there.
/// The fee is left out of the target, so the pool lands within it of the curve price.
pub fn rebalance(r_meme: i128, r_pair: i128, v_pair: i128, v_token: i128) -> Option<(bool, i128, i128)> {
    let k = r_meme * r_pair;
    // meme reserve at the curve price: √(k·v_token / v_pair), keeping precision when it fits
    let target = isqrt(match k.checked_mul(v_token) {
        Some(n) => n / v_pair,
        None => k / v_pair * v_token,
    });
    if target < r_meme {
        // memes are cheap in the pool: buy them with pair
        let net = ceil_div(k, target) - r_pair;
        let amount_in = gross_in(net);
        let out = amount_out(amount_in, r_pair, r_meme);
        (out > 0).then_some((false, amount_in, out))
    } else if target > r_meme {
        // memes are dear in the pool: sell them for pair
        let amount_in = gross_in(target - r_meme);
        let out = amount_out(amount_in, r_meme, r_pair);
        (out > 0).then_some((true, amount_in, out))
    } else {
        None
    }
}
