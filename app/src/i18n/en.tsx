import { fmt } from "@/lib/units";
import type { Dict } from "./es";

export const en: Dict = {
  meta: {
    title: "The Hooks Daily · Memecoins backed by bonds",
    description: "A Stellar launchpad where every memecoin keeps its reserve in a tokenized real-world asset.",
  },

  ago: (n, unit) => (unit === "s" ? `${n}s ago` : unit === "m" ? `${n} min ago` : unit === "h" ? `${n}h ago` : `${n}d ago`),

  pairLabel: {
    CETES: "Mexican debt in pesos",
    TESOURO: "Brazilian debt in reais",
    USTRY: "US debt in dollars",
    other: "tokenized sovereign debt",
  },

  common: {
    close: "Close",
    signing: "Signing…",
    by: "By",
    you: "you",
    deposit: "Deposit",
    addDeposit: "+ Deposit",
    graduation: "Graduation",
    graduated: "Graduated",
    marketCap: "Market cap",
    favorite: "Favorite",
    seeTx: "see tx",
    perYear: " a year",
    noBond: (sym) => `You have no ${sym}.`,
    loginToTrade: "Sign in with your wallet (top right) to trade.",
    loginToDeposit: "Sign in with your wallet (top right) to deposit.",
    trustline: (sym) => `your wallet accepts ${sym}`,
    checkFailed: "Couldn't check your account. Try again.",
  },

  news: {
    banner: (progress) => (progress >= 90 ? "Almost there!" : progress >= 50 ? "Halfway up!" : "And they're off!"),
    lead: (symbol, progress) =>
      progress >= 90
        ? `$${symbol} is ${fmt(100 - progress, 1)}% from graduating`
        : progress >= 50
          ? `$${symbol} has sold over half its curve`
          : `$${symbol} leads the race to Soroswap`,
    story: (symbol, o) => {
      const s = `$${symbol}`;
      if (o.graduated) return `${s} graduates to Soroswap`;
      if (o.change !== undefined && o.change >= 100) return `${s} soars ${fmt(o.change, 0)}% in a day`;
      if (o.change !== undefined && o.change >= 1) return `${s} up ${fmt(o.change, 1)}% in 24 hours`;
      if (o.change !== undefined && o.change <= -1) return `${s} down ${fmt(-o.change, 1)}% in 24 hours`;
      if (o.progress >= 50) return `${s} passes the halfway mark`;
      return `${s} goes on sale`;
    },
    ear: (symbol, o) => {
      const s = `$${symbol}`;
      if (o.fresh) return `${s} is born`;
      if (o.change !== undefined && o.change >= 0) return `${s} up ${fmt(o.change, 0)}%`;
      if (o.change !== undefined) return `${s} down ${fmt(-o.change, 0)}%`;
      return s;
    },
  },

  header: {
    search: "Search a meme or ticker",
    searchLabel: "Search",
    cancel: "Cancel",
    dividends: "Dividends",
    create: "Create",
    createMore: " coin",
    openProfile: "Open profile",
    login: "Sign in",
    loginKicker: "Free, no paper",
    loginTitle: "Subscribe",
    cavos: "Email or Google",
    cavosNote: "No extension, no XLM. Cavos pays the fees.",
    stellar: "Stellar wallet",
    stellarNote: "Freighter, xBull, Lobstr and more.",
    testnet: "The Hooks Daily runs on testnet: none of this is real money.",
  },

  footer: {
    printed: (mainnet) =>
      mainnet ? "Printed on Stellar mainnet." : "Printed on Stellar testnet: the bonds are sandbox ones, with real prices and rates.",
    editor: (contract, admin) => (
      <>
        Editor: the contract {contract}. Its admin ({admin}) can replace its code, and with it its rules, reserves included.
      </>
    ),
    mainnet: "Unaudited contracts. Use small amounts.",
  },

  activity: {
    label: "Breaking",
    aria: "Live activity",
    bought: "▲ bought",
    boughtBack: "▲ bought back",
    sold: "▼ sold",
    of: "of",
  },

  card: {
    yields: (rate) => ` · yields ${rate}%`,
    lede: (o) => (
      <>
        Worth {o.mcap}
        {o.change && <> ({o.change})</>}, it holds {o.reserve} {o.inPool ? "in its Soroswap pool" : "in reserve"}. {o.trades}{" "}
        trades{o.volume ? `, ${o.volume} in 24h` : ""}; the last one {o.last}.
      </>
    ),
  },

  home: {
    sorts: { activity: "Activity", new: "New", mcap: "Market cap", grad: "Graduating" },
    special: "Special edition",
    photo: "Photo:",
    kingKicker: (name) => `King of the hill · ${name}`,
    kingDeck: (progress, label) => `${progress}% of the curve sold, backed by ${label}.`,
    kingLede: (o) =>
      `Its reserve holds ${o.reserve} ${o.sym}${o.rate ? `, earning ${o.rate}% a year even if nobody trades` : ""}. The market values it at ${o.mcap}, and once the rest of its curve sells, its liquidity moves to Soroswap.`,
    reserveIn: (sym) => `Reserve in ${sym}`,
    jump: (sym) => `Continued on the $${sym} page →`,
    page: (sym) => `P. $${sym}`,
    motto: "The degens' favorite paper · All the sovereign debt that fits in a meme",
    edition: (mainnet) => (mainnet ? "Mainnet edition" : "Testnet edition"),
    weather: (sym, rate) => `Weather: ${sym} ${rate}% ▲`,
    issue: (n) => `Vol. I · No. ${n}`,
    free: "Free",
    sections: "Sections",
    sortBy: "Sort",
    favorites: "★ Favorites",
    filterBy: "Filter by backing",
    all: "All",
    results: (q) => `Results for “${q}”`,
    readFailed: (e) => `Couldn't read the contract: ${e}`,
    noMatch: (q) => `No meme matches “${q}”.`,
    noFavorites: "Mark memes with ☆ to see them here.",
    noneBacked: "No memes with this backing yet.",
    publishFirst: "Publish the first one",
    indicatorAria: "Bonds bought by memes",
    indicator: "Indicator",
    indicatorKicker: "Sovereign debt bought by memes",
    indicatorNote: "Every meme keeps its reserve in a tokenized bond that earns even if nobody trades.",
    markets: "Meme exchange",
    colMeme: "Meme",
    colMcap: "Mcap",
    col24h: "24h",
    colCurve: "Curve",
    grad: "grad.",
  },

  coin: {
    dockTrade: "Buy · sell",
    notFound: (e) => `Couldn't find this meme: ${e}`,
    markets: (sym) => `Markets · ${sym}`,
    kicker: (o) => `${o.pool ? "Graduated · Soroswap" : `Curve at ${o.progress}%`} · Backed by ${o.sym}`,
    deck: (name, label) => `${name}, backed by ${label}.`,
    devHolds: (p) => `· the dev holds ${p}% of supply`,
    copyTitle: "Copy token address",
    copied: "copied ✓",
    explorer: "explorer ↗",
    share: "share ↗",
    shareText: (sym, pair, label) => `$${sym} on Hooks: its reserve is ${pair}, ${label}.`,
    price: "Price",
    reserve: "Reserve",
    volume: "24h vol",
    trades: "Trades",
    holders: "Holders",
    colAccount: "Account",
    colType: "Type",
    colWhen: "When",
    colTx: "Tx",
    colShare: "% of supply",
    badgeBuyback: "buyback",
    buy: "▲ buy",
    sell: "▼ sell",
    tradesFailed: (e) => `Couldn't read the trades: ${e}`,
    noTrades: "No trades in the last 7 days. Be the first.",
    loadingTrades: "Reading trades…",
    pool: "Soroswap pool",
    curveUnsold: "Curve (unsold)",
    holdersNote: "Counts the wallets that bought or sold on the curve.",
    bonding: "Bonding curve",
    graduated: "graduated",
    curveSold: "Curve sold",
    soldOut: "The curve sold its 800M and the liquidity moved to Soroswap.",
    toGraduate: (need, sym, left) => `~${need} ${sym} left to graduate. ${left} of 800M still for sale.`,
    backing: (name) => `Backing: ${name}`,
    inPool: "In the pool",
    inReserve: "In reserve",
    reserveNote: (label, rate, currency) => `The reserve is ${label} and earns ${rate}% a year in ${currency}: it grows even if nobody trades.`,
    yieldsToday: "Earns today",
    yielded: "Has earned",
    vault: "Buyback vault",
    paidHolders: "Paid to holders",
    burned: "Burned by buybacks",
    chartIntervals: "Candle interval",
    chartAria: "Market cap candles in USD",
    chartCaption: (interval) => `Market cap in dollars, in ${interval} candles, with volume below.`,
    chartEmpty: " No trades yet: the first candle shows up with the first buy.",
  },

  trade: {
    connect: "Connect a wallet first.",
    zero: "Enter an amount above zero.",
    quoting: "Still quoting, try again in a moment.",
    onlyHave: (n, sym) => `You only have ${n} $${sym}.`,
    logBuy: (sym, paid, got, pool) => `bought $${sym}${pool ? " on Soroswap" : ""} −${paid} +${got}`,
    logSell: (sym, sold, got, pool) => `sold $${sym}${pool ? " on Soroswap" : ""} −${sold} +${got}`,
    logMigrate: (sym) => `$${sym} moved to Soroswap`,
    logBuyback: (sym) => `bought back and burned $${sym}`,
    openPoolLabel: "Clip and open the pool",
    soldOut: "The curve sold out. Its Soroswap pool still has to be opened; anyone can do it.",
    openPool: "Open the Soroswap pool",
    couponLabel: (sym) => `Clip and trade $${sym}`,
    inPool: "Graduated: it trades in its Soroswap pool, with the liquidity locked forever.",
    seePool: "see pool ↗",
    action: "Action",
    buy: "Buy",
    sell: "Sell",
    pay: (sym) => `You pay in ${sym}`,
    selling: (sym) => `You sell $${sym}`,
    balance: "balance",
    receive: "You get",
    impact: "Price impact",
    poolFee: "Soroswap fee 0.3%",
    curveFee: "Fee 1% (½ creator · ¼ vault & holders · ¼ protocol)",
    slippage: "Max slippage",
    slippageLabel: "Maximum slippage",
    fills: "Charged (fills the curve)",
    submit: (buy, sym) => `${buy ? "Buy" : "Sell"} $${sym}`,
    getIt: (etherfuse, aquarius) => (
      <>
        Get some on {etherfuse} or {aquarius}
      </>
    ),
    retry: (pct) => `Retry with ${pct}%`,
    buyback: "Buyback & burn",
    buybackNote: (sym) => `The vault spends up to 1% of the pool's reserve on $${sym} and burns it. Anyone can call it.`,
    buybackDo: (sym) => `Buy back and burn $${sym}`,
  },

  dividendPanel: {
    title: "Dividends",
    paid: (amount, sym) => `${amount} ${sym} paid out`,
    note: (meme, sym) => `Every buy and sell on the curve pays part of its fee to those who already held $${meme}, by how much they held, in ${sym}.`,
    yours: "Yours",
    claim: (sym) => `Claim ${sym}`,
    logClaim: (amount, sym, meme) => `claimed ${amount} ${sym} from $${meme}`,
  },

  profile: {
    title: "Your profile",
    changePhoto: "Change photo",
    change: "Change",
    badImage: "Couldn't read that image.",
    name: "Your name",
    nameLabel: "Name",
    copied: "copied ✓",
    removePhoto: "remove photo",
    uploadPhoto: "upload photo",
    bio: "Bio: which memes you like, what you're betting on…",
    local: "Your profile only lives in this browser.",
    worth: "Worth in memes and bonds",
    pnl: "Memes P&L",
    pnlNote: " · in USD at today's rate",
    seeDividends: "See your dividends",
    bonds: "Bonds",
    yourMemes: "Your memes",
    noCost: "unknown cost",
    realized: (v) => `realized ${v}`,
    sellAll: (out) => `selling it all ~${out}`,
    onSoroswap: "on Soroswap: those trades don't count here",
    noMemes: "No memes yet. Get a bond and buy your first.",
    created: "Created by you",
    claim: "claim",
    logClaim: (sym) => `claimed $${sym} fees`,
    disconnect: "Disconnect",
  },

  deposit: {
    done: "Done",
    working: "Depositing",
    empty: "The faucet is out of bonds for now. Try again later.",
    inWallet: "are in your wallet",
    simulatedShort: "Simulated deposit from our testnet faucet.",
    seeTx: "see transaction ↗",
    trade: "Start trading",
    simulated: "Simulated deposit",
    simulatedNote:
      "Hooks runs on testnet: we don't take money. Our faucet sends you Etherfuse sandbox bonds to try it. In production, Etherfuse takes your pesos by bank transfer and sends you the real bond.",
    bond: "Bond",
    wouldPay: "You'd deposit",
    receive: "You get",
    submit: (fiat) => `Simulate a${fiat ? ` ${fiat}` : ""} deposit`,
    checking: "Checking your wallet…",
    preparing: (sym) => `Getting your wallet ready for ${sym}…`,
    sending: (n, sym) => `Sending ${n} ${sym} from the faucet…`,
    logReceived: (n, sym) => `received ${n} ${sym}`,
  },

  create: {
    loginFirst: "Sign in with your wallet first (top right).",
    nameAndTicker: "Give it a name and a ticker.",
    deploying: "Deploying your token…",
    logCreated: (sym) => `created $${sym}`,
    couponLabel: "Classified ad · fill in by hand",
    kicker: "Classifieds · New issues",
    title: "Publish your meme",
    deck: "In today's edition, with its reserve in a sovereign bond.",
    name: "Name",
    ticker: "Ticker",
    backing: "Reserve backing",
    devBuy: (sym) => `Initial buy in ${sym} (optional)`,
    devBuyNote: "Bought in the same transaction, before anyone else.",
    cost: (amount, sym) => `Creating costs ${amount} ${sym}, which go to your coin's vault: half is paid to its holders.`,
    submit: "Publish my meme",
    preview: "How it will print",
    now: "now",
    finePrint: "Fine print",
    fine: (sym) => [
      "Fixed 1B supply: 800M sell on the curve.",
      `The reserve is held in ${sym}, which earns even if nobody trades.`,
      "Once the 800M sell, the liquidity moves to Soroswap and stays locked.",
      `You earn 0.5% of every buy and sell on the curve, in ${sym}.`,
      `Another 0.25% goes to your coin's vault: half is paid to its holders in ${sym}, the rest buys back and burns after graduation.`,
      "The photo is looked up by name on Wikipedia; until images can be uploaded, pick a name that can be photographed.",
    ],
  },

  dividends: {
    title: "Your dividends",
    claiming: (i, n) => `Claiming ${i} of ${n}…`,
    owed: (amount, what) => `${amount} to claim in ${what}`,
    memes: (n) => `${n} memes`,
    everyTrade: (what) => `Every buy and sell of ${what} pays you in its bond`,
    yourMemes: (n) => `your ${n} memes`,
    loginFirst: "Sign in with your wallet, top right, to see what each of your memes owes you.",
    none: "No memes yet. Holding a meme earns you part of its fees, in the bond behind it and by how much you hold.",
    seeMemes: "See memes",
    toClaim: "To claim",
    claimAll: (n) => `Claim all ${n}`,
    how: "How it works",
    fine: [
      "Every buy and sell on the curve pays 1%; a quarter goes to the meme's vault.",
      "Half of what enters the vault belongs to the meme's holders, by how much they hold. The other half buys back and burns.",
      "It's paid out in that same buy or sell, by what each holder had before it.",
      "Claiming sends the bond to your wallet, where it keeps earning.",
    ],
    holds: (n, sym) => `you hold ${n} · pays in ${sym}`,
    nothing: "Nothing yet",
    claim: "Claim",
  },

  og: {
    backedBy: (sym, label) => `Backed by ${sym}, ${label}`,
    reserve: "Reserve",
    yields: "Yields",
    perYear: (rate) => `${rate}% a year`,
    curve: "Curve",
  },

  faucet: {
    noFaucet: "There's no faucet on mainnet.",
    notConfigured: "The faucet isn't configured.",
    tooMany: "You've asked for several deposits this hour. Try again later.",
    unknownBond: "That bond isn't in the faucet.",
    badAddress: "Invalid address.",
    noTrustline: (sym) => `Your account doesn't accept ${sym} yet.`,
    enough: (sym) => `You already have enough ${sym} to try it.`,
    rejected: "The network rejected the transfer. Try again.",
    failed: "The transfer failed on-chain.",
    dry: (sym) => `The faucet is out of ${sym} or not responding.`,
  },

  errors: {
    slippage: "The price moved more than your slippage. Raise it and try again.",
    contract: {
      1: "That pair isn't allowed.",
      3: "That memecoin doesn't exist.",
      4: "Invalid amount.",
      6: "This memecoin already graduated: it now trades on Soroswap.",
      7: "Only the creator can claim these fees.",
      8: "Invalid name (1–32) or ticker (1–12).",
      9: "No fees to claim.",
      10: "Your balance isn't enough.",
      11: "The curve hasn't sold out yet.",
      12: "The Soroswap pool is already open.",
      13: "Your account doesn't accept this token yet: it needs the trustline.",
      14: "Your account needs XLM for the trustline's reserve.",
      15: "This memecoin has no Soroswap pool yet.",
      16: "The buyback vault is empty.",
      201: "You have no dividends to claim.",
      202: "That address isn't a pool of this memecoin.",
    },
    contractOther: (code) => `Contract error #${code}.`,
    timeout: "Signing took too long. Try again.",
    cancelled: "You cancelled the transaction.",
    policy: "The app's Cavos policy doesn't allow this transaction.",
    app: {
      invalidAmount: "Invalid amount",
      notConnected: "Connect a wallet first.",
      cavosNotConnected: "Cavos wallet not connected.",
      cavosApprove: "This device can't sign yet. Sign out and back in with the same email or Google to restore your wallet here.",
      cavosNoRecovery: "Your wallet isn't backed up yet. Open it on the device where you created it, sign out and back in there, then sign in here again.",
      noMainnetAccount: "Your account doesn't exist on mainnet yet: it needs XLM.",
      networkRejected: "The network rejected the transaction.",
      txFailed: "The transaction failed on-chain.",
      txTimeout: "The transaction wasn't confirmed in time.",
    },
  },
};
