extern crate std;

use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    Address, Env, IntoVal, String,
};

use crate::{DividendError, MemeToken, MemeTokenClient};

const MEME: i128 = 10_000_000;

/// Soroswap's factory, reduced to the one pair the tests register.
#[contract]
struct MockFactory;

#[contractimpl]
impl MockFactory {
    pub fn set(e: Env, pool: Address) {
        e.storage().instance().set(&0u32, &pool);
    }
    pub fn pair_exists(e: Env, _a: Address, _b: Address) -> bool {
        e.storage().instance().has(&0u32)
    }
    pub fn get_pair(e: Env, _a: Address, _b: Address) -> Address {
        e.storage().instance().get(&0u32).unwrap()
    }
}

struct T<'a> {
    e: Env,
    launchpad: Address,
    token: MemeTokenClient<'a>,
    reward: Address,
    factory: Address,
}

fn setup<'a>() -> T<'a> {
    let e = Env::default();
    e.mock_all_auths();
    let launchpad = Address::generate(&e);
    let reward = e.register_stellar_asset_contract_v2(Address::generate(&e)).address();
    let factory = e.register(MockFactory, ());
    let id = e.register(
        MemeToken,
        (
            &launchpad,
            String::from_str(&e, "Taco Coin"),
            String::from_str(&e, "TACO"),
            1_000_000 * MEME,
            &reward,
            &factory,
        ),
    );
    let token = MemeTokenClient::new(&e, &id);
    T { e, launchpad, token, reward, factory }
}

impl T<'_> {
    fn give(&self, to: &Address, memes: i128) {
        self.token.transfer(&self.launchpad, to, &(memes * MEME));
    }

    /// What the launchpad does in `distribute`: sends the bond, then calls `notify`.
    fn pay(&self, amount: i128) {
        StellarAssetClient::new(&self.e, &self.reward).mint(&self.token.address, &amount);
        self.token.notify(&amount);
    }

    fn bond(&self, a: &Address) -> i128 {
        TokenClient::new(&self.e, &self.reward).balance(a)
    }
}

#[test]
fn constructor_mints_fixed_supply_to_launchpad() {
    let t = setup();
    assert_eq!(t.token.balance(&t.launchpad), 1_000_000 * MEME);
    assert_eq!(t.token.total_supply(), 1_000_000 * MEME);
    assert_eq!(t.token.decimals(), 7);
    assert_eq!(t.token.symbol(), String::from_str(&t.e, "TACO"));
    assert_eq!(t.token.reward(), t.reward);
    assert!(t.token.is_excluded(&t.launchpad));
    assert!(t.token.is_excluded(&t.token.address));
    assert_eq!(t.token.total_shares(), 0);
}

#[test]
fn holders_earn_by_balance_and_the_launchpad_earns_nothing() {
    let t = setup();
    let (a, b) = (Address::generate(&t.e), Address::generate(&t.e));
    t.give(&a, 300);
    t.give(&b, 100);
    assert_eq!(t.token.total_shares(), 400 * MEME);

    t.pay(4_000);
    assert_eq!(t.token.claimable(&a), 3_000);
    assert_eq!(t.token.claimable(&b), 1_000);
    assert_eq!(t.token.claimable(&t.launchpad), 0);
}

#[test]
fn a_transfer_between_deposits_moves_only_future_earnings() {
    let t = setup();
    let (a, b) = (Address::generate(&t.e), Address::generate(&t.e));
    t.give(&a, 300);
    t.give(&b, 100);
    t.pay(4_000);
    t.token.transfer(&a, &b, &(200 * MEME));
    t.pay(4_000);
    // a held 300 for the first deposit and 100 for the second; b the other way round
    assert_eq!(t.token.claimable(&a), 3_000 + 1_000);
    assert_eq!(t.token.claimable(&b), 1_000 + 3_000);
}

#[test]
fn transfer_from_and_burns_settle_too() {
    let t = setup();
    let (a, b, spender) = (Address::generate(&t.e), Address::generate(&t.e), Address::generate(&t.e));
    t.give(&a, 200);
    t.give(&b, 200);
    t.token.approve(&a, &spender, &(100 * MEME), &1_000);
    t.token.transfer_from(&spender, &a, &b, &(100 * MEME));
    t.token.burn(&b, &(100 * MEME));
    assert_eq!(t.token.total_shares(), 300 * MEME);
    t.token.approve(&b, &spender, &(100 * MEME), &1_000);
    t.token.burn_from(&spender, &b, &(100 * MEME));
    assert_eq!(t.token.total_shares(), 200 * MEME);

    t.pay(2_000);
    assert_eq!(t.token.claimable(&a), 1_000);
    assert_eq!(t.token.claimable(&b), 1_000);
}

#[test]
fn a_deposit_with_no_holders_waits_for_them() {
    let t = setup();
    t.pay(500);
    let a = Address::generate(&t.e);
    t.give(&a, 10);
    assert_eq!(t.token.claimable(&a), 0);
    t.pay(100);
    assert_eq!(t.token.claimable(&a), 600);
}

#[test]
fn anyone_can_claim_for_a_holder_and_the_bond_goes_to_the_holder() {
    let t = setup();
    let a = Address::generate(&t.e);
    t.give(&a, 10);
    t.pay(1_000);
    assert_eq!(t.token.claim(&a), 1_000);
    assert_eq!(t.bond(&a), 1_000);
    assert_eq!(t.token.claimable(&a), 0);
    assert_eq!(t.token.try_claim(&a).unwrap_err().unwrap(), DividendError::NothingToClaim.into());
}

#[test]
fn only_the_launchpad_can_notify() {
    let t = setup();
    let a = Address::generate(&t.e);
    t.give(&a, 10);
    t.e.set_auths(&[]);
    let stranger = Address::generate(&t.e);
    let r = t
        .token
        .mock_auths(&[MockAuth {
            address: &stranger,
            invoke: &MockAuthInvoke {
                contract: &t.token.address,
                fn_name: "notify",
                args: (100i128,).into_val(&t.e),
                sub_invokes: &[],
            },
        }])
        .try_notify(&100);
    assert!(r.is_err());
}

#[test]
fn an_excluded_pool_hands_back_what_it_earned() {
    let t = setup();
    let (a, pool) = (Address::generate(&t.e), Address::generate(&t.e));
    assert_eq!(
        t.token.try_exclude_pool(&t.reward).unwrap_err().unwrap(),
        DividendError::NotAPool.into()
    );
    t.give(&a, 100);
    t.give(&pool, 100);
    t.pay(2_000);
    assert_eq!(t.token.claimable(&pool), 1_000);

    MockFactoryClient::new(&t.e, &t.factory).set(&pool);
    assert_eq!(t.token.exclude_pool(&t.reward), pool);
    assert_eq!(t.token.claimable(&pool), 0);
    assert_eq!(t.token.total_shares(), 100 * MEME);
    // a pool keeps trading but never earns again
    t.token.transfer(&a, &pool, &(50 * MEME));
    t.pay(1_000);
    assert_eq!(t.token.claimable(&pool), 0);
    // the pool's 1,000 went back in with the next deposit
    assert_eq!(t.token.claimable(&a), 1_000 + 1_000 + 1_000);
}

#[test]
fn claims_never_exceed_deposits() {
    let t = setup();
    let holders: std::vec::Vec<Address> = (0..7).map(|_| Address::generate(&t.e)).collect();
    for (i, h) in holders.iter().enumerate() {
        t.give(h, 3 + 11 * i as i128);
    }
    let mut paid = 0;
    for round in 0..5i128 {
        let amount = 997 + 13 * round;
        t.pay(amount);
        paid += amount;
        let owed: i128 = holders.iter().map(|h| t.token.claimable(h)).sum();
        assert!(owed <= paid, "round {round}: owed {owed} > paid {paid}");
        let (from, to) = (&holders[round as usize], &holders[(round as usize + 3) % 7]);
        t.token.transfer(from, to, &MEME);
    }
    let claimed: i128 = holders.iter().map(|h| t.token.try_claim(h).map(|r| r.unwrap()).unwrap_or(0)).sum();
    assert!(claimed <= paid);
    assert!(paid - claimed < 50, "dust {}", paid - claimed);
    assert_eq!(t.bond(&t.token.address), paid - claimed);
}

#[test]
fn a_huge_deposit_over_one_meme_does_not_overflow_later_holders() {
    let t = setup();
    let (a, b) = (Address::generate(&t.e), Address::generate(&t.e));
    t.give(&a, 1);
    // ten million bonds over a single meme, then most of the supply changes hands
    t.pay(10_000_000 * MEME);
    t.give(&b, 900_000);
    t.token.transfer(&b, &a, &(400_000 * MEME));
    t.pay(10_000_000 * MEME);
    assert_eq!(t.token.claim(&a) + t.token.claim(&b), 20_000_000 * MEME - t.bond(&t.token.address));
}
