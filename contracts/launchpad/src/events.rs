use soroban_sdk::{contractevent, Address, String};

#[contractevent(topics = ["create"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Create {
    #[topic]
    pub meme: Address,
    pub creator: Address,
    pub pair: Address,
    pub name: String,
    pub symbol: String,
}

#[contractevent(topics = ["trade"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Trade {
    #[topic]
    pub meme: Address,
    pub trader: Address,
    pub is_buy: bool,
    pub pair_amt: i128,
    pub meme_amt: i128,
    pub v_pair: i128,
    pub v_token: i128,
    pub real_pair: i128,
    /// Ledger close time, so an indexer's copy of the event is enough to chart it.
    pub at: u64,
}

#[contractevent(topics = ["graduate"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Graduate {
    #[topic]
    pub meme: Address,
    pub real_pair: i128,
}

#[contractevent(topics = ["claim"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Claim {
    #[topic]
    pub to: Address,
    pub pair: Address,
    pub amount: i128,
}

#[contractevent(topics = ["migrate"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Migrate {
    #[topic]
    pub meme: Address,
    pub pool: Address,
    pub pair_amt: i128,
    pub meme_amt: i128,
    /// Pair (or memes) the launchpad swapped first to bring a pool someone else seeded to the
    /// curve's price. Zero when the pool was empty.
    pub rebalanced: i128,
}

#[contractevent(topics = ["buyback"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Buyback {
    #[topic]
    pub meme: Address,
    pub pair_amt: i128,
    pub burned: i128,
}
