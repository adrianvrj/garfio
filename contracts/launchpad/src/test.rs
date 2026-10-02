extern crate std;

use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

use crate::curve::{self, DECIMALS, FOR_SALE, SUPPLY, V_TOKEN0};
use crate::{Error, Launchpad, LaunchpadClient};

mod meme {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/meme_token.wasm");
}

const CETES_V0: i128 = 3_000 * DECIMALS;
const NVDA_V0: i128 = 16 * DECIMALS;

struct T<'a> {
    e: Env,
    lp: LaunchpadClient<'a>,
    admin: Address,
    cetes: Address,
}

fn setup<'a>() -> T<'a> {
    let e = Env::default();
    e.mock_all_auths();
    e.cost_estimate().budget().reset_unlimited();
    let admin = Address::generate(&e);
    let wasm = e.deployer().upload_contract_wasm(meme::WASM);
    let id = e.register(Launchpad, (&admin, wasm));
    let lp = LaunchpadClient::new(&e, &id);
    let cetes = e.register_stellar_asset_contract_v2(admin.clone()).address();
    lp.add_pair(&cetes, &CETES_V0);
    T { e, lp, admin, cetes }
}

fn fund(t: &T, who: &Address, amount: i128) {
    StellarAssetClient::new(&t.e, &t.cetes).mint(who, &amount);
}

fn create(t: &T, creator: &Address) -> Address {
    t.lp.create(creator, &String::from_str(&t.e, "Taco Coin"), &String::from_str(&t.e, "TACO"), &t.cetes)
}

#[test]
fn create_deploys_token_with_supply_in_launchpad() {
    let t = setup();
    let creator = Address::generate(&t.e);
    let m = create(&t, &creator);
    let tok = TokenClient::new(&t.e, &m);
    assert_eq!(tok.balance(&t.lp.address), SUPPLY);
    assert_eq!(tok.symbol(), String::from_str(&t.e, "TACO"));
    assert_eq!(tok.decimals(), 7);
    assert_eq!(t.lp.memes().len(), 1);
    let c = t.lp.curve(&m);
    assert_eq!((c.v_pair, c.v_token, c.sold), (CETES_V0, V_TOKEN0, 0));

    let m2 = create(&t, &creator);
    assert_ne!(m, m2);
}

#[test]
fn create_rejects_unknown_pair() {
    let t = setup();
    let other = t.e.register_stellar_asset_contract_v2(t.admin.clone()).address();
    let r = t.lp.try_create(
        &Address::generate(&t.e),
        &String::from_str(&t.e, "X"),
        &String::from_str(&t.e, "X"),
        &other,
    );
    assert_eq!(r.unwrap_err().unwrap(), Error::PairNotAllowed.into());
}

#[test]
fn buy_matches_formula_and_splits_fees() {
    let t = setup();
    let creator = Address::generate(&t.e);
    let buyer = Address::generate(&t.e);
    let m = create(&t, &creator);
    let pin = 100 * DECIMALS;
    fund(&t, &buyer, pin);

    let (q_out, q_charged, q_fee) = t.lp.quote_buy(&m, &pin);
    let out = t.lp.buy(&buyer, &m, &pin, &q_out);
    assert_eq!(out, q_out);
    assert_eq!(q_charged, pin);
    assert_eq!(q_fee, DECIMALS); // 1% of 100

    let k = CETES_V0 * V_TOKEN0;
    let new_vp = CETES_V0 + pin - q_fee;
    let expected = V_TOKEN0 - (k + new_vp - 1) / new_vp;
    assert_eq!(out, expected);

    let c = t.lp.curve(&m);
    assert_eq!(c.fees_creator, DECIMALS / 2);
    assert_eq!(t.lp.protocol_fees(&t.cetes), DECIMALS / 2);
    assert_eq!(c.real_pair, pin - q_fee);
    assert_eq!(TokenClient::new(&t.e, &m).balance(&buyer), out);
}

#[test]
fn buy_respects_min_out() {
    let t = setup();
    let buyer = Address::generate(&t.e);
    let m = create(&t, &Address::generate(&t.e));
    fund(&t, &buyer, 100 * DECIMALS);
    let (q_out, _, _) = t.lp.quote_buy(&m, &(100 * DECIMALS));
    let r = t.lp.try_buy(&buyer, &m, &(100 * DECIMALS), &(q_out + 1));
    assert_eq!(r.unwrap_err().unwrap(), Error::Slippage.into());
}

#[test]
fn buy_then_sell_returns_less() {
    let t = setup();
    let buyer = Address::generate(&t.e);
    let m = create(&t, &Address::generate(&t.e));
    let pin = 500 * DECIMALS;
    fund(&t, &buyer, pin);
    let out = t.lp.buy(&buyer, &m, &pin, &0);
    let (q_back, _) = t.lp.quote_sell(&m, &out);
    let back = t.lp.sell(&buyer, &m, &out, &q_back);
    assert_eq!(back, q_back);
    assert!(back < pin);
    // ~2% lost to fees, nothing more
    assert!(back > pin * 97 / 100);
    let c = t.lp.curve(&m);
    assert_eq!(c.sold, 0);
    assert!(c.real_pair >= 0);
}

#[test]
fn fills_up_to_for_sale_then_graduates() {
    let t = setup();
    let buyer = Address::generate(&t.e);
    let m = create(&t, &Address::generate(&t.e));
    let target = curve::grad_target(CETES_V0);
    // tCETES graduates at ~8,791 real reserve, as in the simulator
    assert!(target > 8_790 * DECIMALS && target < 8_793 * DECIMALS);

    let pin = 20_000 * DECIMALS;
    fund(&t, &buyer, pin);
    let out = t.lp.buy(&buyer, &m, &pin, &0);
    assert_eq!(out, FOR_SALE);
    let c = t.lp.curve(&m);
    assert!(c.graduated);
    assert!(c.real_pair >= target);
    // only the needed amount was charged
    let spent = pin - TokenClient::new(&t.e, &t.cetes).balance(&buyer);
    assert!(spent < pin && spent > target);

    let r = t.lp.try_buy(&buyer, &m, &DECIMALS, &0);
    assert_eq!(r.unwrap_err().unwrap(), Error::Graduated.into());
}

#[test]
fn claim_fees_only_creator() {
    let t = setup();
    let creator = Address::generate(&t.e);
    let buyer = Address::generate(&t.e);
    let m = create(&t, &creator);
    fund(&t, &buyer, 1_000 * DECIMALS);
    t.lp.buy(&buyer, &m, &(1_000 * DECIMALS), &0);

    let r = t.lp.try_claim_fees(&buyer, &m);
    assert_eq!(r.unwrap_err().unwrap(), Error::NotCreator.into());

    let got = t.lp.claim_fees(&creator, &m);
    assert_eq!(got, 5 * DECIMALS);
    assert_eq!(TokenClient::new(&t.e, &t.cetes).balance(&creator), 5 * DECIMALS);
    let r = t.lp.try_claim_fees(&creator, &m);
    assert_eq!(r.unwrap_err().unwrap(), Error::NothingToClaim.into());

    let treasury = Address::generate(&t.e);
    assert_eq!(t.lp.claim_protocol(&t.cetes, &treasury), 5 * DECIMALS);
}

#[test]
fn pair_balance_covers_reserves_and_fees() {
    let t = setup();
    let creator = Address::generate(&t.e);
    let m1 = create(&t, &creator);
    let m2 = create(&t, &creator);
    let a = Address::generate(&t.e);
    let b = Address::generate(&t.e);
    fund(&t, &a, 5_000 * DECIMALS);
    fund(&t, &b, 5_000 * DECIMALS);
    let oa = t.lp.buy(&a, &m1, &(1_234 * DECIMALS), &0);
    t.lp.buy(&b, &m1, &(777 * DECIMALS), &0);
    t.lp.buy(&b, &m2, &(3_000 * DECIMALS), &0);
    t.lp.sell(&a, &m1, &(oa / 3), &0);

    let c1 = t.lp.curve(&m1);
    let c2 = t.lp.curve(&m2);
    let owed = c1.real_pair + c2.real_pair + c1.fees_creator + c2.fees_creator + t.lp.protocol_fees(&t.cetes);
    let held = TokenClient::new(&t.e, &t.cetes).balance(&t.lp.address);
    assert!(held >= owed);
    assert!(held - owed < 10); // only rounding dust
}

#[test]
fn nvda_pair_has_no_overflow() {
    let t = setup();
    let nvda = t.e.register_stellar_asset_contract_v2(t.admin.clone()).address();
    t.lp.add_pair(&nvda, &NVDA_V0);
    let m = t.lp.create(&Address::generate(&t.e), &String::from_str(&t.e, "Nvidia Doge"), &String::from_str(&t.e, "NVDOGE"), &nvda);
    let buyer = Address::generate(&t.e);
    StellarAssetClient::new(&t.e, &nvda).mint(&buyer, &(100 * DECIMALS));
    let out = t.lp.buy(&buyer, &m, &(DECIMALS / 2), &0);
    assert!(out > 0);
    assert_eq!(t.lp.pairs().len(), 2);
}
