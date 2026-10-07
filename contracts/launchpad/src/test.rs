extern crate std;

use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

use crate::curve::{self, DECIMALS, FOR_POOL, FOR_SALE, SUPPLY, V_TOKEN0};
use crate::{Error, Launchpad, LaunchpadClient, Position};

mod meme {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/meme_token.wasm");
}

/// Soroswap's own contracts, as deployed on testnet (see testdata/README).
mod soroswap_factory {
    soroban_sdk::contractimport!(file = "testdata/soroswap_factory.wasm");
}
mod soroswap_pair {
    soroban_sdk::contractimport!(file = "testdata/soroswap_pair.wasm");
}
use soroswap_factory::Client as FactoryClient;
use soroswap_pair::Client as PoolClient;

const CETES_V0: i128 = 3_000 * DECIMALS;
/// Half of every vault inflow goes to the holders, as the testnet deploy does.
const DIV_BPS: u32 = 5_000;

struct T<'a> {
    e: Env,
    lp: LaunchpadClient<'a>,
    admin: Address,
    cetes: Address,
    factory: FactoryClient<'a>,
}

fn setup<'a>() -> T<'a> {
    let e = Env::default();
    e.mock_all_auths();
    e.cost_estimate().budget().reset_unlimited();
    let admin = Address::generate(&e);
    let wasm = e.deployer().upload_contract_wasm(meme::WASM);
    let pair_wasm = e.deployer().upload_contract_wasm(soroswap_pair::WASM);
    let factory = FactoryClient::new(&e, &e.register(soroswap_factory::WASM, ()));
    factory.initialize(&admin, &pair_wasm);
    let id = e.register(Launchpad, (&admin, wasm, factory.address.clone(), DIV_BPS));
    let lp = LaunchpadClient::new(&e, &id);
    let cetes = e.register_stellar_asset_contract_v2(admin.clone()).address();
    lp.add_pair(&cetes, &CETES_V0, &0);
    T { e, lp, admin, cetes, factory }
}

fn fund(t: &T, who: &Address, amount: i128) {
    StellarAssetClient::new(&t.e, &t.cetes).mint(who, &amount);
}

fn create(t: &T, creator: &Address) -> Address {
    t.lp.create(creator, &String::from_str(&t.e, "Taco Coin"), &String::from_str(&t.e, "TACO"), &t.cetes, &0)
}

/// Creates a meme and buys out its curve.
fn graduated(t: &T) -> Address {
    let m = create(t, &Address::generate(&t.e));
    let buyer = Address::generate(&t.e);
    fund(t, &buyer, 20_000 * DECIMALS);
    t.lp.buy(&buyer, &m, &(20_000 * DECIMALS), &0);
    m
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
    assert_eq!(t.lp.meme_count(), 1);
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
        &0,
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
    assert_eq!((c.vault, c.dividends), (DECIMALS / 8, DECIMALS / 8));
    // the holders' half already sits in the token
    assert_eq!(TokenClient::new(&t.e, &t.cetes).balance(&m), DECIMALS / 8);
    assert_eq!(t.lp.protocol_fees(&t.cetes), DECIMALS / 4);
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
    assert_eq!(t.lp.claim_protocol(&t.cetes, &treasury), 5 * DECIMALS / 2);
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
    let owed = c1.real_pair + c2.real_pair + c1.fees_creator + c2.fees_creator + c1.vault + c2.vault
        + t.lp.protocol_fees(&t.cetes);
    let held = TokenClient::new(&t.e, &t.cetes).balance(&t.lp.address);
    assert!(held >= owed);
    assert!(held - owed < 10); // only rounding dust
}

#[test]
fn large_reserve_pair_has_no_overflow() {
    let t = setup();
    let big = t.e.register_stellar_asset_contract_v2(t.admin.clone()).address();
    t.lp.add_pair(&big, &(50_000 * DECIMALS), &0);
    let m = t.lp.create(&Address::generate(&t.e), &String::from_str(&t.e, "Big"), &String::from_str(&t.e, "BIG"), &big, &0);
    let buyer = Address::generate(&t.e);
    StellarAssetClient::new(&t.e, &big).mint(&buyer, &(500_000 * DECIMALS));
    assert_eq!(t.lp.buy(&buyer, &m, &(500_000 * DECIMALS), &0), FOR_SALE);
    t.lp.migrate(&m);
    assert_eq!(t.lp.pairs().len(), 2);
}

#[test]
fn create_with_dev_buy_fills_for_the_creator() {
    let t = setup();
    let creator = Address::generate(&t.e);
    fund(&t, &creator, 100 * DECIMALS);
    let quote = {
        let probe = create(&t, &Address::generate(&t.e));
        t.lp.quote_buy(&probe, &(100 * DECIMALS)).0
    };
    let m = t.lp.create(&creator, &String::from_str(&t.e, "Taco"), &String::from_str(&t.e, "TACO"), &t.cetes, &(100 * DECIMALS));
    assert_eq!(TokenClient::new(&t.e, &m).balance(&creator), quote);
    assert_eq!(t.lp.curve(&m).sold, quote);
}

#[test]
fn migrate_seeds_pool_at_curve_price_and_locks_lp() {
    let t = setup();
    let m = create(&t, &Address::generate(&t.e));
    assert_eq!(t.lp.try_migrate(&m).unwrap_err().unwrap(), Error::NotGraduated.into());

    let m = graduated(&t);
    let before = t.lp.curve(&m);
    let pool = t.lp.migrate(&m);
    assert_eq!(pool, t.factory.get_pair(&m, &t.cetes));

    let meme = TokenClient::new(&t.e, &m);
    let cetes = TokenClient::new(&t.e, &t.cetes);
    assert_eq!(meme.balance(&pool), FOR_POOL);
    assert_eq!(meme.balance(&t.lp.address), 0);
    let pooled = cetes.balance(&pool);
    // the pool opens at the curve's last price
    assert_eq!(pooled, FOR_POOL * before.v_pair / before.v_token);
    let c = t.lp.curve(&m);
    let left = before.real_pair - pooled;
    assert_eq!(c.vault + c.dividends - before.vault - before.dividends, left);
    assert_eq!(c.dividends - before.dividends, left * DIV_BPS as i128 / 10_000);
    assert!(meme::Client::new(&t.e, &m).is_excluded(&pool));
    // every LP share but Soroswap's locked minimum is the launchpad's, for good
    let lp = PoolClient::new(&t.e, &pool);
    assert_eq!(lp.balance(&t.lp.address), lp.total_supply() - 1_000);

    assert_eq!((c.real_pair, c.pool.clone(), c.burned), (0, Some(pool), 0));
    assert_eq!(t.lp.try_migrate(&m).unwrap_err().unwrap(), Error::Migrated.into());

    // what stays here is exactly the creator's fees, the vault, the dividends and the protocol's
    let owed = c.fees_creator + c.vault + t.lp.protocol_fees(&t.cetes);
    assert_eq!(cetes.balance(&t.lp.address), owed);
}

/// An attacker buys memes on the curve, creates the Soroswap pair first and seeds it at
/// `price_x100`/100 of the curve's final price, then pulls their liquidity after the migration.
/// Returns (what they put in, what they took out), both valued at the curve's final price, and
/// the pool's price after the migration as a share of the curve's, in thousandths.
fn preseeded_attack(t: &T, price_x100: i128) -> (i128, i128, i128) {
    let m = create(t, &Address::generate(&t.e));
    let attacker = Address::generate(&t.e);
    fund(t, &attacker, 1_000 * DECIMALS);
    let memes = t.lp.buy(&attacker, &m, &(1_000 * DECIMALS), &0);

    // final curve price, in pair per meme: v_pair / v_token once FOR_SALE is sold
    let v_pair_end = CETES_V0 + curve::grad_target(CETES_V0);
    let v_token_end = V_TOKEN0 - FOR_SALE;
    let seed_memes = memes / 10;
    let seed_pair = seed_memes * v_pair_end / v_token_end * price_x100 / 100;
    fund(t, &attacker, seed_pair);
    let pool = t.factory.create_pair(&m, &t.cetes);
    TokenClient::new(&t.e, &m).transfer(&attacker, &pool, &seed_memes);
    TokenClient::new(&t.e, &t.cetes).transfer(&attacker, &pool, &seed_pair);
    let pc = PoolClient::new(&t.e, &pool);
    pc.deposit(&attacker);

    let buyer = Address::generate(&t.e);
    fund(t, &buyer, 20_000 * DECIMALS);
    t.lp.buy(&buyer, &m, &(20_000 * DECIMALS), &0);
    let c = t.lp.curve(&m);
    let value = |memes: i128, pair: i128| pair + memes * c.v_pair / c.v_token;
    t.lp.migrate(&m);

    let meme_before = TokenClient::new(&t.e, &m).balance(&attacker);
    let pair_before = TokenClient::new(&t.e, &t.cetes).balance(&attacker);
    pc.transfer(&attacker, &pool, &pc.balance(&attacker));
    pc.withdraw(&attacker);
    let got_memes = TokenClient::new(&t.e, &m).balance(&attacker) - meme_before;
    let got_pair = TokenClient::new(&t.e, &t.cetes).balance(&attacker) - pair_before;

    let (r0, r1) = pc.get_reserves();
    let (rm, rp) = if pc.token_0() == m { (r0, r1) } else { (r1, r0) };
    let price_x1000 = rp * c.v_token * 1000 / (rm * c.v_pair);
    (value(seed_memes, seed_pair), value(got_memes, got_pair), price_x1000)
}

/// Soroswap's 0.3% fee keeps a rebalanced pool within about that much of the curve's price.
fn on_the_curve(price_x1000: i128) -> bool {
    (990..=1010).contains(&price_x1000)
}

#[test]
fn migrate_into_a_pool_seeded_cheap_does_not_pay_the_seeder() {
    for price_x100 in [1, 50] {
        let (put, took, price) = preseeded_attack(&setup(), price_x100);
        assert!(took <= put, "at {price_x100}%: attacker took {took}, put {put}");
        assert!(on_the_curve(price), "at {price_x100}%: pool at {price}/1000 of the curve");
    }
}

#[test]
fn migrate_into_a_pool_seeded_dear_does_not_pay_the_seeder() {
    let (put, took, price) = preseeded_attack(&setup(), 1_000);
    assert!(took <= put, "attacker took {took}, put {put}");
    assert!(on_the_curve(price), "pool at {price}/1000 of the curve");
}

#[test]
fn migrate_into_a_pool_seeded_beyond_the_reserve_still_does_not_pay_the_seeder() {
    // The seeder put in more pair than the whole reserve: the launchpad sells them half its
    // memes above the curve's price and pools the rest, so the pool stays dear but they lose.
    let (put, took, _) = preseeded_attack(&setup(), 10_000);
    assert!(took <= put, "attacker took {took}, put {put}");
}

#[test]
fn migrate_into_a_pool_seeded_at_the_curve_price_keeps_it_fair() {
    let (put, took, price) = preseeded_attack(&setup(), 100);
    // an honest early LP keeps what they put in, give or take rounding
    assert!(took <= put && took * 1000 >= put * 995, "put {put}, took {took}");
    assert!(on_the_curve(price));
}

#[test]
fn buyback_spends_the_vault_and_burns() {
    let t = setup();
    let m = graduated(&t);
    assert_eq!(t.lp.try_buyback(&m).unwrap_err().unwrap(), Error::NotMigrated.into());
    let pool = t.lp.migrate(&m);

    let token = meme::Client::new(&t.e, &m);
    let supply = token.total_supply();
    let before = t.lp.curve(&m);
    let pool_pair = TokenClient::new(&t.e, &t.cetes).balance(&pool);
    let burned = t.lp.buyback(&m);
    let c = t.lp.curve(&m);

    let spent = before.vault - c.vault;
    assert!(spent > 0 && spent <= pool_pair / 100);
    assert_eq!(c.burned - before.burned, burned);
    assert_eq!(token.total_supply(), supply - burned);
    assert_eq!(token.balance(&t.lp.address), 0);

    // it keeps going until the vault is empty
    while t.lp.curve(&m).vault > 0 {
        t.lp.buyback(&m);
    }
    assert_eq!(t.lp.try_buyback(&m).unwrap_err().unwrap(), Error::VaultEmpty.into());
}

#[test]
fn every_trade_pays_the_holders_before_it() {
    let t = setup();
    let m = create(&t, &Address::generate(&t.e));
    let token = meme::Client::new(&t.e, &m);
    let (a, b) = (Address::generate(&t.e), Address::generate(&t.e));
    fund(&t, &a, 3_000 * DECIMALS);
    fund(&t, &b, 1_000 * DECIMALS);

    // nobody held before the first buy: its dividend waits for the next trade
    t.lp.buy(&a, &m, &(1_000 * DECIMALS), &0);
    assert_eq!(token.claimable(&a), 0);
    // a held everything before b's buy, so a earns both fees and b none of its own
    t.lp.buy(&b, &m, &(1_000 * DECIMALS), &0);
    let paid = t.lp.curve(&m).dividends;
    let ca = token.claimable(&a);
    // rounding holds back a sliver, carried to the next payout
    assert!(ca <= paid && paid - ca < paid / 1_000, "paid {paid}, a {ca}");
    assert_eq!(token.claimable(&b), 0);

    // after a sale both hold, and the seller's fee goes to what each holds after it
    let sold = token.balance(&a) / 2;
    t.lp.sell(&a, &m, &sold, &0);
    let fee = t.lp.curve(&m).dividends - paid;
    let (ma, mb) = (token.balance(&a), token.balance(&b));
    let (ga, gb) = (token.claimable(&a) - ca, token.claimable(&b));
    assert!(ga + gb <= fee + (paid - ca) && fee + (paid - ca) - ga - gb < fee / 1_000);
    assert!((ga * mb - gb * ma).abs() <= ma.max(mb));

    let before = TokenClient::new(&t.e, &t.cetes).balance(&a);
    let got = token.claim(&a);
    assert_eq!(TokenClient::new(&t.e, &t.cetes).balance(&a) - before, got);
}

#[test]
fn dividends_survive_migration_and_the_pool_never_earns() {
    let t = setup();
    let m = create(&t, &Address::generate(&t.e));
    // someone opens the pool early and seeds it, so it holds memes before the migration
    let early = Address::generate(&t.e);
    fund(&t, &early, 1_000 * DECIMALS);
    let memes = t.lp.buy(&early, &m, &(1_000 * DECIMALS), &0);
    let pool = t.factory.create_pair(&m, &t.cetes);
    TokenClient::new(&t.e, &m).transfer(&early, &pool, &(memes / 10));
    let token = meme::Client::new(&t.e, &m);

    let buyer = Address::generate(&t.e);
    fund(&t, &buyer, 20_000 * DECIMALS);
    t.lp.buy(&buyer, &m, &(20_000 * DECIMALS), &0);
    assert!(token.claimable(&pool) > 0);
    let owed = token.claimable(&buyer) + token.claimable(&early);
    let paid = t.lp.curve(&m).dividends;
    t.lp.migrate(&m);
    assert!(token.is_excluded(&pool));
    assert_eq!(token.claimable(&pool), 0);

    // the migration's leftover reaches the holders in the same call, and buybacks still run
    assert!(t.lp.curve(&m).dividends > paid);
    assert!(token.claimable(&buyer) + token.claimable(&early) > owed);
    t.lp.buyback(&m);
    assert_eq!(token.claimable(&pool), 0);
    let held = TokenClient::new(&t.e, &t.cetes).balance(&m);
    assert!(token.claim(&buyer) + token.claim(&early) <= held);
}

#[test]
fn create_fee_seeds_the_vault() {
    let t = setup();
    let paid = t.e.register_stellar_asset_contract_v2(t.admin.clone()).address();
    let fee = 15 * DECIMALS;
    t.lp.add_pair(&paid, &CETES_V0, &fee);
    let creator = Address::generate(&t.e);
    let make = |t: &T| t.lp.try_create(&creator, &String::from_str(&t.e, "Fee"), &String::from_str(&t.e, "FEE"), &paid, &0);
    assert!(make(&t).is_err()); // nothing to pay with

    StellarAssetClient::new(&t.e, &paid).mint(&creator, &fee);
    let m = make(&t).unwrap().unwrap();
    let c = t.lp.curve(&m);
    assert_eq!((c.vault, c.dividends), (fee / 2, fee / 2));
    assert_eq!(t.lp.pair(&paid).create_fee, fee);
    assert_eq!(TokenClient::new(&t.e, &paid).balance(&creator), 0);
}

#[test]
fn memes_page_in_creation_order() {
    let t = setup();
    let ids: std::vec::Vec<Address> = (0..3).map(|_| create(&t, &Address::generate(&t.e))).collect();
    assert_eq!(t.lp.meme_count(), 3);
    let first = t.lp.memes(&0, &2);
    assert_eq!((first.len(), first.get(0).unwrap(), first.get(1).unwrap()), (2, ids[0].clone(), ids[1].clone()));
    assert_eq!(t.lp.memes(&2, &10).len(), 1);
    assert_eq!(t.lp.memes(&5, &10).len(), 0);
    assert_eq!(t.lp.memes(&0, &u32::MAX).len(), 3);
    let curves = t.lp.curves(&1, &50);
    assert_eq!((curves.len(), curves.get(0).unwrap().token), (2, ids[1].clone()));
}

fn pos(held: i128, cost: i128, realized: i128) -> Position {
    Position { held, cost, realized }
}

#[test]
fn position_tracks_buys_at_cost_with_fee() {
    let t = setup();
    let a = Address::generate(&t.e);
    let m = create(&t, &Address::generate(&t.e));
    fund(&t, &a, 300 * DECIMALS);
    assert_eq!(t.lp.position(&a, &m), pos(0, 0, 0));
    let o1 = t.lp.buy(&a, &m, &(100 * DECIMALS), &0);
    let o2 = t.lp.buy(&a, &m, &(200 * DECIMALS), &0);
    assert_eq!(t.lp.position(&a, &m), pos(o1 + o2, 300 * DECIMALS, 0));
}

#[test]
fn partial_sell_realizes_against_average_cost() {
    let t = setup();
    let a = Address::generate(&t.e);
    let m = create(&t, &Address::generate(&t.e));
    let pin = 1_000 * DECIMALS;
    fund(&t, &a, pin);
    let held = t.lp.buy(&a, &m, &pin, &0);
    let sold = held / 4;
    let out = t.lp.sell(&a, &m, &sold, &0);
    let basis = pin * sold / held;
    assert_eq!(t.lp.position(&a, &m), pos(held - sold, pin - basis, out - basis));
}

#[test]
fn buy_sell_buy_keeps_the_running_basis() {
    let t = setup();
    let a = Address::generate(&t.e);
    let m = create(&t, &Address::generate(&t.e));
    fund(&t, &a, 1_000 * DECIMALS);
    let o1 = t.lp.buy(&a, &m, &(100 * DECIMALS), &0);
    let back = t.lp.sell(&a, &m, &o1, &0);
    let o2 = t.lp.buy(&a, &m, &(300 * DECIMALS), &0);
    // the first round trip is closed: the basis is only the second buy
    assert_eq!(t.lp.position(&a, &m), pos(o2, 300 * DECIMALS, back - 100 * DECIMALS));
}

#[test]
fn sell_of_transferred_tokens_realizes_only_the_bought_part() {
    let t = setup();
    let a = Address::generate(&t.e);
    let b = Address::generate(&t.e);
    let m = create(&t, &Address::generate(&t.e));
    fund(&t, &a, 200 * DECIMALS);
    fund(&t, &b, 200 * DECIMALS);
    let oa = t.lp.buy(&a, &m, &(200 * DECIMALS), &0);
    let ob = t.lp.buy(&b, &m, &(200 * DECIMALS), &0);
    TokenClient::new(&t.e, &m).transfer(&b, &a, &ob);

    let amount = oa + ob;
    let out = t.lp.sell(&a, &m, &amount, &0);
    assert_eq!(t.lp.position(&a, &m), pos(0, 0, out * oa / amount - 200 * DECIMALS));
    // b's position still holds what b bought, though the tokens are gone
    assert_eq!(t.lp.position(&b, &m), pos(ob, 200 * DECIMALS, 0));

    // a seller who never bought gets no position
    let c = Address::generate(&t.e);
    let c_bal = 1_000 * DECIMALS;
    fund(&t, &b, 100 * DECIMALS);
    t.lp.buy(&b, &m, &(100 * DECIMALS), &0);
    TokenClient::new(&t.e, &m).transfer(&b, &c, &c_bal);
    t.lp.sell(&c, &m, &c_bal, &0);
    assert_eq!(t.lp.position(&c, &m), pos(0, 0, 0));
}

#[test]
fn dev_buy_opens_the_creator_position() {
    let t = setup();
    let creator = Address::generate(&t.e);
    fund(&t, &creator, 100 * DECIMALS);
    let m = t.lp.create(&creator, &String::from_str(&t.e, "Taco"), &String::from_str(&t.e, "TACO"), &t.cetes, &(100 * DECIMALS));
    let bal = TokenClient::new(&t.e, &m).balance(&creator);
    assert_eq!(t.lp.position(&creator, &m), pos(bal, 100 * DECIMALS, 0));
}

#[test]
fn selling_everything_clears_held_and_cost() {
    let t = setup();
    let a = Address::generate(&t.e);
    let m = create(&t, &Address::generate(&t.e));
    fund(&t, &a, 3 * DECIMALS);
    // odd amounts leave rounding in a proportional basis
    let held = t.lp.buy(&a, &m, &(3 * DECIMALS), &0);
    let o1 = t.lp.sell(&a, &m, &(held / 3), &0);
    let o2 = t.lp.sell(&a, &m, &(held - held / 3), &0);
    assert_eq!(t.lp.position(&a, &m), pos(0, 0, o1 + o2 - 3 * DECIMALS));
}

#[test]
fn upgrade_requires_the_admin() {
    let t = setup();
    let hash = t.e.deployer().upload_contract_wasm(meme::WASM);
    t.e.set_auths(&[]);
    assert!(t.lp.try_upgrade(&hash).is_err());
}

#[test]
fn position_ttl_follows_the_token_balances() {
    use soroban_sdk::testutils::storage::Persistent as _;
    let t = setup();
    let a = Address::generate(&t.e);
    let m = create(&t, &Address::generate(&t.e));
    fund(&t, &a, 2 * DECIMALS);
    let ttl = || {
        let key = crate::storage::Key::Position(a.clone(), m.clone());
        t.e.as_contract(&t.lp.address, || t.e.storage().persistent().get_ttl(&key))
    };
    let day = 17_280;
    t.lp.buy(&a, &m, &DECIMALS, &0);
    // a new position starts at the network's minimum, like a new token balance
    assert!(ttl() < 29 * day);
    t.lp.buy(&a, &m, &DECIMALS, &0);
    assert_eq!(ttl(), 30 * day);
}
