import type { ReactNode } from "react";
import { fmt } from "@/lib/units";

/** The source dictionary: the other languages must have every key, typed the same. */
export const es = {
  meta: {
    title: "The Hooks Daily · Memecoins respaldadas por bonos",
    description: "Launchpad en Stellar donde cada memecoin guarda su reserva en un activo real tokenizado.",
  },

  ago: (n: number, unit: "s" | "m" | "h" | "d") =>
    unit === "s" ? `hace ${n}s` : unit === "m" ? `hace ${n} min` : unit === "h" ? `hace ${n} h` : `hace ${n} d`,

  /** Whose debt backs each bond, for the copy. */
  pairLabel: {
    CETES: "deuda de México en pesos",
    TESOURO: "deuda de Brasil en reales",
    USTRY: "deuda de EE.UU. en dólares",
    other: "deuda soberana tokenizada",
  } as Record<string, string>,

  common: {
    close: "Cerrar",
    signing: "Firmando…",
    by: "Por",
    you: "tú",
    deposit: "Depositar",
    addDeposit: "+ Depositar",
    graduation: "Graduación",
    graduated: "Graduada",
    marketCap: "Market cap",
    favorite: "Favorita",
    seeTx: "ver tx",
    perYear: " anual",
    noBond: (sym: string) => `No tienes ${sym}.`,
    loginToTrade: "Entra con tu wallet (arriba a la derecha) para operar.",
    loginToDeposit: "Entra con tu wallet (arriba a la derecha) para depositar.",
    trustline: (sym: string) => `tu wallet acepta ${sym}`,
    checkFailed: "No pude revisar tu cuenta. Intenta de nuevo.",
  },

  /** The paper's copy: headlines written from a meme's numbers. Nothing here is invented, only phrased. */
  news: {
    /** The front page's banner word, shouted from how close the lead meme is to graduating. */
    banner: (progress: number): string => (progress >= 90 ? "¡A un paso!" : progress >= 50 ? "¡Media curva!" : "¡Arranca la carrera!"),
    lead: (symbol: string, progress: number) =>
      progress >= 90
        ? `$${symbol}, a ${fmt(100 - progress, 1)}% de graduar`
        : progress >= 50
          ? `$${symbol} ya vendió más de la mitad de su curva`
          : `$${symbol} encabeza la carrera a Soroswap`,
    /** Graduation first, then the day's move, then the curve. */
    story: (symbol: string, o: { graduated: boolean; progress: number; change?: number }) => {
      const s = `$${symbol}`;
      if (o.graduated) return `${s} se gradúa y pasa a Soroswap`;
      if (o.change !== undefined && o.change >= 100) return `${s} se dispara ${fmt(o.change, 0)}% en un día`;
      if (o.change !== undefined && o.change >= 1) return `${s} sube ${fmt(o.change, 1)}% en 24 horas`;
      if (o.change !== undefined && o.change <= -1) return `${s} cae ${fmt(-o.change, 1)}% en 24 horas`;
      if (o.progress >= 50) return `${s} pasa la mitad de su curva`;
      return `${s} sale a la venta`;
    },
    /** The ears' teasers: shorter, shoutier. */
    ear: (symbol: string, o: { change?: number; fresh?: boolean }) => {
      const s = `$${symbol}`;
      if (o.fresh) return `Nace ${s}`;
      if (o.change !== undefined && o.change >= 0) return `${s} sube ${fmt(o.change, 0)}%`;
      if (o.change !== undefined) return `${s} cae ${fmt(-o.change, 0)}%`;
      return s;
    },
  },

  header: {
    search: "Busca un meme o ticker",
    searchLabel: "Buscar",
    cancel: "Cancelar",
    dividends: "Dividendos",
    create: "Crear",
    createMore: " moneda",
    openProfile: "Abrir perfil",
    login: "Entrar",
    loginKicker: "Gratis, sin papel",
    loginTitle: "Suscríbete",
    cavos: "Email o Google",
    cavosNote: "Sin extensión ni XLM. Cavos paga los fees.",
    stellar: "Wallet de Stellar",
    stellarNote: "Freighter, xBull, Lobstr y otras.",
    testnet: "The Hooks Daily circula en testnet: nada de esto es dinero real.",
  },

  footer: {
    printed: (mainnet: boolean): string =>
      mainnet ? "Impreso en Stellar mainnet." : "Impreso en Stellar testnet: los bonos son de sandbox, con precio y tasa reales.",
    editor: (contract: ReactNode, admin: ReactNode) => (
      <>
        Editor: el contrato {contract}. Su admin ({admin}) puede reemplazar su código, y con eso sus reglas, incluidas las
        de las reservas.
      </>
    ),
    mainnet: "Contratos sin auditoría. Usa montos pequeños.",
  },

  activity: {
    label: "Última hora",
    aria: "Actividad en vivo",
    bought: "▲ compró",
    boughtBack: "▲ recompró",
    sold: "▼ vendió",
    of: "de",
  },

  card: {
    yields: (rate: string) => ` · rinde ${rate}%`,
    lede: (o: { mcap: string; change: ReactNode; reserve: string; inPool: boolean; trades: number; volume: string | null; last: string }) => (
      <>
        Vale {o.mcap}
        {o.change && <> ({o.change})</>} y guarda {o.reserve} {o.inPool ? "en su pool de Soroswap" : "en reserva"}. {o.trades}{" "}
        operaciones{o.volume ? `, ${o.volume} en 24 h` : ""}; la última, {o.last}.
      </>
    ),
  },

  home: {
    sorts: { activity: "Actividad", new: "Nuevas", mcap: "Market cap", grad: "Por graduar" },
    special: "Edición especial",
    photo: "Foto:",
    kingKicker: (name: string) => `Rey de la colina · ${name}`,
    kingDeck: (progress: string, label: string) => `${progress}% de la curva vendida, respaldada por ${label}.`,
    kingLede: (o: { reserve: string; sym: string; rate: string | null; mcap: string }) =>
      `Su reserva guarda ${o.reserve} ${o.sym}${o.rate ? `, que rinden ${o.rate}% anual aunque nadie opere` : ""}. Vale ${o.mcap} en el mercado y, al venderse lo que queda de su curva, su liquidez pasa a Soroswap.`,
    reserveIn: (sym: string) => `Reserva en ${sym}`,
    jump: (sym: string) => `Sigue en la página de $${sym} →`,
    page: (sym: string) => `Pág. $${sym}`,
    motto: "El diario favorito de los degens · Toda la deuda soberana que cabe en un meme",
    edition: (mainnet: boolean): string => (mainnet ? "Edición mainnet" : "Edición testnet"),
    weather: (sym: string, rate: string) => `Clima: ${sym} ${rate}% ▲`,
    issue: (n: number) => `Año I · Núm. ${n}`,
    free: "Gratis",
    sections: "Secciones",
    sortBy: "Ordenar",
    favorites: "★ Favoritas",
    filterBy: "Filtrar por respaldo",
    all: "Todos",
    results: (q: string) => `Resultados para “${q}”`,
    readFailed: (e: string) => `No pude leer el contrato: ${e}`,
    noMatch: (q: string) => `Ninguna meme coincide con “${q}”.`,
    noFavorites: "Marca memes con ☆ para verlas aquí.",
    noneBacked: "Todavía no hay memes con este respaldo.",
    publishFirst: "Publica la primera",
    indicatorAria: "Bonos comprados por memes",
    indicator: "Indicador",
    indicatorKicker: "Deuda soberana comprada por memes",
    indicatorNote: "Cada meme guarda su reserva en un bono tokenizado, que rinde aunque nadie opere.",
    markets: "Bolsa de memes",
    colMeme: "Meme",
    colMcap: "Mcap",
    col24h: "24 h",
    colCurve: "Curva",
    grad: "grad.",
  },

  coin: {
    dockTrade: "Comprar · vender",
    notFound: (e: string) => `No encontré esta meme: ${e}`,
    markets: (sym: string) => `Mercados · ${sym}`,
    kicker: (o: { pool: boolean; progress: string; sym: string }) =>
      `${o.pool ? "Graduada · Soroswap" : `Curva al ${o.progress}%`} · Respaldo ${o.sym}`,
    deck: (name: string, label: string) => `${name}, respaldada por ${label}.`,
    devHolds: (p: string) => `· el dev tiene ${p}% del supply`,
    copyTitle: "Copiar dirección del token",
    copied: "copiado ✓",
    explorer: "explorer ↗",
    share: "compartir ↗",
    shareText: (sym: string, pair: string, label: string) => `$${sym} en Hooks: su reserva es ${pair}, ${label}.`,
    price: "Precio",
    reserve: "Reserva",
    volume: "Vol 24 h",
    trades: "Trades",
    holders: "Holders",
    colAccount: "Cuenta",
    colType: "Tipo",
    colWhen: "Cuándo",
    colTx: "Tx",
    colShare: "% del supply",
    badgeBuyback: "recompra",
    buy: "▲ compra",
    sell: "▼ venta",
    tradesFailed: (e: string) => `No pude leer los trades: ${e}`,
    noTrades: "Sin trades en los últimos 7 días. Sé el primero.",
    loadingTrades: "Leyendo trades…",
    pool: "Pool en Soroswap",
    curveUnsold: "Curva (sin vender)",
    holdersNote: "Cuenta las wallets que compraron o vendieron en la curva.",
    bonding: "Curva de bonding",
    graduated: "graduada",
    curveSold: "Curva vendida",
    soldOut: "La curva vendió sus 800M y la liquidez pasó a Soroswap.",
    toGraduate: (need: string, sym: string, left: string) => `Faltan ~${need} ${sym} para graduar. Quedan ${left} de 800M a la venta.`,
    backing: (name: string) => `Respaldo: ${name}`,
    inPool: "En el pool",
    inReserve: "En reserva",
    reserveNote: (label: string, rate: string, currency: string) =>
      `La reserva es ${label} y rinde ${rate}% anual en ${currency}: su valor sube aunque nadie opere.`,
    yieldsToday: "Rinde hoy",
    yielded: "Ha rendido",
    vault: "Vault de recompra",
    paidHolders: "Repartido a holders",
    burned: "Quemado por recompras",
    chartIntervals: "Intervalo de las velas",
    chartAria: "Velas del market cap en USD",
    chartCaption: (interval: string) => `Market cap en dólares, en velas de ${interval}, con el volumen abajo.`,
    chartEmpty: " Sin trades todavía: la primera vela aparece con la primera compra.",
  },

  trade: {
    connect: "Conecta una wallet primero.",
    zero: "Escribe una cantidad mayor a cero.",
    quoting: "Todavía estoy cotizando, intenta en un momento.",
    onlyHave: (n: string, sym: string) => `Solo tienes ${n} $${sym}.`,
    logBuy: (sym: string, paid: string, got: string, pool: boolean) => `compraste $${sym}${pool ? " en Soroswap" : ""} −${paid} +${got}`,
    logSell: (sym: string, sold: string, got: string, pool: boolean) => `vendiste $${sym}${pool ? " en Soroswap" : ""} −${sold} +${got}`,
    logMigrate: (sym: string) => `$${sym} pasó a Soroswap`,
    logBuyback: (sym: string) => `recompraste y quemaste $${sym}`,
    openPoolLabel: "Recorte y abra el pool",
    soldOut: "La curva se vendió completa. Falta abrir su pool en Soroswap; cualquiera puede hacerlo.",
    openPool: "Abrir pool en Soroswap",
    couponLabel: (sym: string) => `Recorte y opere $${sym}`,
    inPool: "Graduada: se opera en su pool de Soroswap, con la liquidez bloqueada para siempre.",
    seePool: "ver pool ↗",
    action: "Acción",
    buy: "Comprar",
    sell: "Vender",
    pay: (sym: string) => `Pagas en ${sym}`,
    selling: (sym: string) => `Vendes $${sym}`,
    balance: "saldo",
    receive: "Recibes",
    impact: "Impacto en precio",
    poolFee: "Fee 0.3% de Soroswap",
    curveFee: "Fee 1% (½ creador · ¼ vault y holders · ¼ protocolo)",
    slippage: "Slippage máx.",
    slippageLabel: "Slippage máximo",
    fills: "Se cobra (llena la curva)",
    submit: (buy: boolean, sym: string) => `${buy ? "Comprar" : "Vender"} $${sym}`,
    getIt: (etherfuse: ReactNode, aquarius: ReactNode) => (
      <>
        Consíguelos en {etherfuse} o {aquarius}
      </>
    ),
    retry: (pct: number) => `Reintentar con ${pct}%`,
    buyback: "Recompra y quema",
    buybackNote: (sym: string) => `El vault gasta hasta 1% de la reserva del pool en $${sym} y lo quema. Cualquiera puede llamarlo.`,
    buybackDo: (sym: string) => `Recomprar y quemar $${sym}`,
  },

  dividendPanel: {
    title: "Dividendos",
    paid: (amount: string, sym: string) => `${amount} ${sym} repartidos`,
    note: (meme: string, sym: string) =>
      `Cada compra y venta en la curva paga parte de su fee a quienes ya tenían $${meme}, según cuánto tenían, en ${sym}.`,
    yours: "Te toca",
    claim: (sym: string) => `Cobrar ${sym}`,
    logClaim: (amount: string, sym: string, meme: string) => `cobraste ${amount} ${sym} de $${meme}`,
  },

  profile: {
    title: "Tu perfil",
    changePhoto: "Cambiar foto",
    change: "Cambiar",
    badImage: "No pude leer esa imagen.",
    name: "Tu nombre",
    nameLabel: "Nombre",
    copied: "copiada ✓",
    removePhoto: "quitar foto",
    uploadPhoto: "subir foto",
    bio: "Bio: qué memes te gustan, a qué le apuestas…",
    local: "Tu perfil vive solo en este navegador.",
    worth: "Valor en memes y bonos",
    pnl: "P&L en memes",
    pnlNote: " · en USD al tipo de cambio de hoy",
    seeDividends: "Ver tus dividendos",
    bonds: "Bonos",
    yourMemes: "Tus memes",
    noCost: "sin costo conocido",
    realized: (v: string) => `realizado ${v}`,
    sellAll: (out: string) => `si vendes todo ~${out}`,
    onSoroswap: "en Soroswap: esos trades no cuentan aquí",
    noMemes: "Todavía no tienes memes. Consigue un bono y compra la primera.",
    created: "Creadas por ti",
    claim: "cobrar",
    logClaim: (sym: string) => `cobraste fees de $${sym}`,
    disconnect: "Desconectar",
  },

  deposit: {
    done: "Listo",
    working: "Depositando",
    empty: "El faucet se quedó sin bonos por ahora. Intenta más tarde.",
    inWallet: "ya están en tu wallet",
    simulatedShort: "Depósito simulado con nuestro faucet de testnet.",
    seeTx: "ver transacción ↗",
    trade: "A operar",
    simulated: "Depósito simulado",
    simulatedNote:
      "Hooks corre en testnet: no recibimos dinero. Nuestro faucet te envía bonos de sandbox de Etherfuse para que pruebes. En producción, Etherfuse recibe tus pesos por transferencia y te manda el bono real.",
    bond: "Bono",
    wouldPay: "Depositarías",
    receive: "Recibes",
    submit: (fiat: string | null) => `Simular depósito${fiat ? ` de ${fiat}` : ""}`,
    checking: "Revisando tu wallet…",
    preparing: (sym: string) => `Preparando tu wallet para recibir ${sym}…`,
    sending: (n: string, sym: string) => `Enviando ${n} ${sym} desde el faucet…`,
    logReceived: (n: string, sym: string) => `recibiste ${n} ${sym}`,
  },

  create: {
    loginFirst: "Entra con tu wallet primero (arriba a la derecha).",
    nameAndTicker: "Ponle nombre y ticker.",
    deploying: "Desplegando tu token…",
    logCreated: (sym: string) => `creaste $${sym}`,
    couponLabel: "Aviso clasificado · llene a mano",
    kicker: "Clasificados · Nuevas emisiones",
    title: "Publica tu meme",
    deck: "Sale en la edición de hoy, con su reserva en un bono soberano.",
    name: "Nombre",
    ticker: "Ticker",
    backing: "Respaldo de la reserva",
    devBuy: (sym: string) => `Compra inicial en ${sym} (opcional)`,
    devBuyNote: "Se compra en la misma transacción, antes que nadie.",
    cost: (amount: string, sym: string) => `Crear cuesta ${amount} ${sym}, que entran al vault de tu moneda: la mitad se reparte a sus holders.`,
    submit: "Publicar mi meme",
    preview: "Así saldrá impresa",
    now: "ahora",
    finePrint: "Letra pequeña",
    fine: (sym: string) => [
      "Supply fijo de 1B: 800M se venden en la curva.",
      `La reserva se guarda en ${sym}, que rinde aunque nadie opere.`,
      "Al venderse los 800M, la liquidez pasa a Soroswap y queda bloqueada.",
      `Cobras 0.5% de cada compra y venta en la curva, en ${sym}.`,
      `Otro 0.25% va al vault de tu moneda: la mitad se reparte a sus holders en ${sym} y el resto, tras graduar, recompra y quema.`,
      "La foto se busca por el nombre en Wikipedia; mientras no se puedan subir imágenes, elige un nombre que se pueda fotografiar.",
    ],
  },

  dividends: {
    title: "Tus dividendos",
    claiming: (i: number, n: number) => `Cobrando ${i} de ${n}…`,
    owed: (amount: string, what: string) => `${amount} por cobrar en ${what}`,
    memes: (n: number) => `${n} memes`,
    everyTrade: (what: string) => `Cada compra y venta de ${what} te paga en su bono`,
    yourMemes: (n: number) => `tus ${n} memes`,
    loginFirst: "Entra con tu wallet, arriba a la derecha, para ver lo que te toca de cada meme que tienes.",
    none: "No tienes memes todavía. Quien tiene un meme se lleva parte de sus fees, en el bono que lo respalda y según cuánto tenga.",
    seeMemes: "Ver memes",
    toClaim: "Por cobrar",
    claimAll: (n: number) => `Cobrar los ${n}`,
    how: "Cómo funciona",
    fine: [
      "Cada compra y venta en la curva paga 1%; un cuarto va al vault del meme.",
      "La mitad de lo que entra al vault es de quienes tienen el meme, según cuánto tengan. La otra mitad recompra y quema.",
      "Se reparte en la misma compra o venta, según lo que cada quien tenía antes de ella.",
      "Cobrar te manda el bono a tu wallet, y sigue rindiendo ahí.",
    ],
    holds: (n: string, sym: string) => `tienes ${n} · paga en ${sym}`,
    nothing: "Nada por ahora",
    claim: "Cobrar",
  },

  og: {
    backedBy: (sym: string, label: string) => `Respaldada por ${sym}, ${label}`,
    reserve: "Reserva",
    yields: "Rinde",
    perYear: (rate: string) => `${rate}% anual`,
    curve: "Curva",
  },

  /** What the faucet's API answers, in the asker's language. */
  faucet: {
    noFaucet: "En mainnet no hay faucet.",
    notConfigured: "El faucet no está configurado.",
    tooMany: "Ya pediste varios depósitos esta hora. Vuelve a intentar más tarde.",
    unknownBond: "Ese bono no está en el faucet.",
    badAddress: "Dirección inválida.",
    noTrustline: (sym: string) => `Tu cuenta todavía no acepta ${sym}.`,
    enough: (sym: string) => `Ya tienes ${sym} suficientes para probar.`,
    rejected: "La red rechazó el envío. Intenta de nuevo.",
    failed: "El envío falló on-chain.",
    dry: (sym: string) => `El faucet se quedó sin ${sym} o no responde.`,
  },

  errors: {
    slippage: "El precio se movió más que tu slippage. Súbelo e intenta de nuevo.",
    contract: {
      1: "Ese par no está permitido.",
      3: "Esa memecoin no existe.",
      4: "Cantidad inválida.",
      6: "Esta memecoin ya se graduó: ahora se opera en Soroswap.",
      7: "Solo el creador puede cobrar estas fees.",
      8: "Nombre (1–32) o ticker (1–12) inválido.",
      9: "No hay fees por cobrar.",
      10: "No te alcanza el saldo.",
      11: "La curva todavía no se vende completa.",
      12: "El pool en Soroswap ya está abierto.",
      13: "Tu cuenta todavía no acepta este token: falta la trustline.",
      14: "A tu cuenta le falta XLM para la reserva de la trustline.",
      15: "Esta memecoin todavía no tiene pool en Soroswap.",
      16: "El vault de recompra está vacío.",
      201: "No tienes dividendos por cobrar.",
      202: "Esa dirección no es un pool de esta memecoin.",
    } as Record<number, string>,
    contractOther: (code: number) => `Error del contrato #${code}.`,
    timeout: "La operación tardó demasiado en firmarse. Intenta de nuevo.",
    cancelled: "Cancelaste la transacción.",
    policy: "La política de la app en Cavos no permite esta transacción.",
    /** Errors our own code throws (`Oops`). */
    app: {
      invalidAmount: "Cantidad inválida",
      notConnected: "Conecta una wallet primero.",
      cavosNotConnected: "Wallet de Cavos no conectada.",
      cavosApprove: "Este dispositivo todavía no puede firmar. Sal de tu cuenta y vuelve a entrar con el mismo email o Google para restaurar tu wallet aquí.",
      cavosNoRecovery: "Tu wallet aún no está respaldada. Ábrela en el dispositivo donde la creaste, sal y vuelve a entrar ahí, y luego entra de nuevo en este.",
      noMainnetAccount: "Tu cuenta todavía no existe en mainnet: necesita XLM.",
      networkRejected: "La red rechazó la transacción.",
      txFailed: "La transacción falló on-chain.",
      txTimeout: "La transacción no se confirmó a tiempo.",
    },
  },
};

export type Dict = typeof es;
