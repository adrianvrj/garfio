extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{MemeToken, MemeTokenClient};

#[test]
fn constructor_mints_fixed_supply_to_launchpad() {
    let e = Env::default();
    let launchpad = Address::generate(&e);
    let id = e.register(
        MemeToken,
        (&launchpad, String::from_str(&e, "Taco Coin"), String::from_str(&e, "TACO"), 1_000i128),
    );
    let t = MemeTokenClient::new(&e, &id);
    assert_eq!(t.balance(&launchpad), 1_000);
    assert_eq!(t.total_supply(), 1_000);
    assert_eq!(t.decimals(), 7);
    assert_eq!(t.symbol(), String::from_str(&e, "TACO"));
}
