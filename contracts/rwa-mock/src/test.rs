extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{RwaMock, RwaMockClient};

#[test]
fn faucet_mints_fixed_amount() {
    let e = Env::default();
    e.mock_all_auths();
    let id = e.register(
        RwaMock,
        (String::from_str(&e, "Test CETES"), String::from_str(&e, "tCETES"), 10_000_000_000i128),
    );
    let t = RwaMockClient::new(&e, &id);
    let user = Address::generate(&e);
    t.faucet(&user);
    t.faucet(&user);
    assert_eq!(t.balance(&user), 20_000_000_000);
    assert_eq!(t.decimals(), 7);
}
