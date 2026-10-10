import { fmt } from "@/lib/units";
import type { Dict } from "./es";

export const pt: Dict = {
  meta: {
    title: "The Hooks Daily · Memecoins lastreadas em títulos",
    description: "Launchpad na Stellar onde cada memecoin guarda sua reserva em um ativo real tokenizado.",
  },

  ago: (n, unit) => (unit === "s" ? `há ${n}s` : unit === "m" ? `há ${n} min` : unit === "h" ? `há ${n} h` : `há ${n} d`),

  pairLabel: {
    CETES: "dívida do México em pesos",
    TESOURO: "dívida do Brasil em reais",
    USTRY: "dívida dos EUA em dólares",
    other: "dívida soberana tokenizada",
  },

  common: {
    close: "Fechar",
    signing: "Assinando…",
    by: "Por",
    you: "você",
    deposit: "Depositar",
    addDeposit: "+ Depositar",
    graduation: "Graduação",
    graduated: "Graduada",
    marketCap: "Market cap",
    favorite: "Favorita",
    seeTx: "ver tx",
    perYear: " ao ano",
    noBond: (sym) => `Você não tem ${sym}.`,
    loginToTrade: "Entre com sua carteira (no canto superior direito) para operar.",
    loginToDeposit: "Entre com sua carteira (no canto superior direito) para depositar.",
    trustline: (sym) => `sua carteira aceita ${sym}`,
    checkFailed: "Não consegui verificar sua conta. Tente de novo.",
  },

  news: {
    banner: (progress) => (progress >= 90 ? "Por um triz!" : progress >= 50 ? "Meia curva!" : "Dada a largada!"),
    lead: (symbol, progress) =>
      progress >= 90
        ? `$${symbol} a ${fmt(100 - progress, 1)}% de se graduar`
        : progress >= 50
          ? `$${symbol} já vendeu mais da metade da curva`
          : `$${symbol} lidera a corrida rumo à Soroswap`,
    story: (symbol, o) => {
      const s = `$${symbol}`;
      if (o.graduated) return `${s} se gradua e vai para a Soroswap`;
      if (o.change !== undefined && o.change >= 100) return `${s} dispara ${fmt(o.change, 0)}% em um dia`;
      if (o.change !== undefined && o.change >= 1) return `${s} sobe ${fmt(o.change, 1)}% em 24 horas`;
      if (o.change !== undefined && o.change <= -1) return `${s} cai ${fmt(-o.change, 1)}% em 24 horas`;
      if (o.progress >= 50) return `${s} passa da metade da curva`;
      return `${s} chega às bancas`;
    },
    ear: (symbol, o) => {
      const s = `$${symbol}`;
      if (o.fresh) return `Nasce ${s}`;
      if (o.change !== undefined && o.change >= 0) return `${s} sobe ${fmt(o.change, 0)}%`;
      if (o.change !== undefined) return `${s} cai ${fmt(-o.change, 0)}%`;
      return s;
    },
  },

  header: {
    search: "Busque um meme ou ticker",
    searchLabel: "Buscar",
    cancel: "Cancelar",
    dividends: "Dividendos",
    create: "Criar",
    createMore: " moeda",
    openProfile: "Abrir perfil",
    login: "Entrar",
    loginKicker: "Grátis, sem papel",
    loginTitle: "Assine",
    cavos: "E-mail ou Google",
    cavosNote: "Sem extensão nem XLM. A Cavos paga as taxas.",
    stellar: "Carteira Stellar",
    stellarNote: "Freighter, xBull, Lobstr e outras.",
    testnet: "The Hooks Daily circula na testnet: nada disto é dinheiro de verdade.",
  },

  footer: {
    printed: (mainnet) =>
      mainnet ? "Impresso na Stellar mainnet." : "Impresso na Stellar testnet: os títulos são de sandbox, com preço e taxa reais.",
    editor: (contract, admin) => (
      <>
        Editor: o contrato {contract}. Seu admin ({admin}) pode substituir o código e, com ele, as regras, inclusive as das
        reservas.
      </>
    ),
    mainnet: "Contratos sem auditoria. Use valores pequenos.",
  },

  activity: {
    label: "Urgente",
    aria: "Atividade ao vivo",
    bought: "▲ comprou",
    boughtBack: "▲ recomprou",
    sold: "▼ vendeu",
    of: "de",
  },

  card: {
    yields: (rate) => ` · rende ${rate}%`,
    lede: (o) => (
      <>
        Vale {o.mcap}
        {o.change && <> ({o.change})</>} e guarda {o.reserve} {o.inPool ? "no seu pool da Soroswap" : "em reserva"}. {o.trades}{" "}
        operações{o.volume ? `, ${o.volume} em 24 h` : ""}; a última, {o.last}.
      </>
    ),
  },

  home: {
    sorts: { activity: "Atividade", new: "Novas", mcap: "Market cap", grad: "Quase graduadas" },
    special: "Edição especial",
    photo: "Foto:",
    kingKicker: (name) => `Rei do pedaço · ${name}`,
    kingDeck: (progress, label) => `${progress}% da curva vendida, lastreada em ${label}.`,
    kingLede: (o) =>
      `Sua reserva guarda ${o.reserve} ${o.sym}${o.rate ? `, que rendem ${o.rate}% ao ano mesmo sem ninguém operar` : ""}. Vale ${o.mcap} no mercado e, quando o resto da curva for vendido, sua liquidez vai para a Soroswap.`,
    reserveIn: (sym) => `Reserva em ${sym}`,
    jump: (sym) => `Continua na página de $${sym} →`,
    page: (sym) => `Pág. $${sym}`,
    motto: "O jornal favorito dos degens · Toda a dívida soberana que cabe num meme",
    edition: (mainnet) => (mainnet ? "Edição mainnet" : "Edição testnet"),
    weather: (sym, rate) => `Tempo: ${sym} ${rate}% ▲`,
    issue: (n) => `Ano I · Nº ${n}`,
    free: "Grátis",
    sections: "Seções",
    sortBy: "Ordenar",
    favorites: "★ Favoritas",
    filterBy: "Filtrar por lastro",
    all: "Todos",
    results: (q) => `Resultados para “${q}”`,
    readFailed: (e) => `Não consegui ler o contrato: ${e}`,
    noMatch: (q) => `Nenhum meme corresponde a “${q}”.`,
    noFavorites: "Marque memes com ☆ para vê-los aqui.",
    noneBacked: "Ainda não há memes com este lastro.",
    publishFirst: "Publique o primeiro",
    indicatorAria: "Títulos comprados por memes",
    indicator: "Indicador",
    indicatorKicker: "Dívida soberana comprada por memes",
    indicatorNote: "Cada meme guarda sua reserva em um título tokenizado, que rende mesmo sem ninguém operar.",
    markets: "Bolsa de memes",
    colMeme: "Meme",
    colMcap: "Mcap",
    col24h: "24 h",
    colCurve: "Curva",
    grad: "grad.",
  },

  coin: {
    dockTrade: "Comprar · vender",
    notFound: (e) => `Não encontrei este meme: ${e}`,
    markets: (sym) => `Mercados · ${sym}`,
    kicker: (o) => `${o.pool ? "Graduada · Soroswap" : `Curva em ${o.progress}%`} · Lastro ${o.sym}`,
    deck: (name, label) => `${name}, lastreada em ${label}.`,
    devHolds: (p) => `· o dev tem ${p}% do supply`,
    copyTitle: "Copiar endereço do token",
    copied: "copiado ✓",
    explorer: "explorer ↗",
    share: "compartilhar ↗",
    shareText: (sym, pair, label) => `$${sym} na Hooks: sua reserva é ${pair}, ${label}.`,
    price: "Preço",
    reserve: "Reserva",
    volume: "Vol 24 h",
    trades: "Trades",
    holders: "Holders",
    colAccount: "Conta",
    colType: "Tipo",
    colWhen: "Quando",
    colTx: "Tx",
    colShare: "% do supply",
    badgeBuyback: "recompra",
    buy: "▲ compra",
    sell: "▼ venda",
    tradesFailed: (e) => `Não consegui ler os trades: ${e}`,
    noTrades: "Nenhum trade nos últimos 7 dias. Seja o primeiro.",
    loadingTrades: "Lendo trades…",
    pool: "Pool na Soroswap",
    curveUnsold: "Curva (não vendida)",
    holdersNote: "Conta as carteiras que compraram ou venderam na curva.",
    bonding: "Curva de bonding",
    graduated: "graduada",
    curveSold: "Curva vendida",
    soldOut: "A curva vendeu seus 800M e a liquidez foi para a Soroswap.",
    toGraduate: (need, sym, left) => `Faltam ~${need} ${sym} para graduar. Restam ${left} de 800M à venda.`,
    backing: (name) => `Lastro: ${name}`,
    inPool: "No pool",
    inReserve: "Em reserva",
    reserveNote: (label, rate, currency) => `A reserva é ${label} e rende ${rate}% ao ano em ${currency}: seu valor sobe mesmo sem ninguém operar.`,
    yieldsToday: "Rende hoje",
    yielded: "Já rendeu",
    vault: "Vault de recompra",
    paidHolders: "Distribuído aos holders",
    burned: "Queimado em recompras",
    chartIntervals: "Intervalo das velas",
    chartAria: "Velas do market cap em USD",
    chartCaption: (interval) => `Market cap em dólares, em velas de ${interval}, com o volume embaixo.`,
    chartEmpty: " Ainda sem trades: a primeira vela aparece com a primeira compra.",
  },

  trade: {
    connect: "Conecte uma carteira primeiro.",
    zero: "Digite um valor maior que zero.",
    quoting: "Ainda estou cotando, tente em um instante.",
    onlyHave: (n, sym) => `Você só tem ${n} $${sym}.`,
    logBuy: (sym, paid, got, pool) => `comprou $${sym}${pool ? " na Soroswap" : ""} −${paid} +${got}`,
    logSell: (sym, sold, got, pool) => `vendeu $${sym}${pool ? " na Soroswap" : ""} −${sold} +${got}`,
    logMigrate: (sym) => `$${sym} foi para a Soroswap`,
    logBuyback: (sym) => `recomprou e queimou $${sym}`,
    openPoolLabel: "Recorte e abra o pool",
    soldOut: "A curva foi vendida por completo. Falta abrir o pool na Soroswap; qualquer um pode fazer isso.",
    openPool: "Abrir pool na Soroswap",
    couponLabel: (sym) => `Recorte e opere $${sym}`,
    inPool: "Graduada: opera no seu pool da Soroswap, com a liquidez travada para sempre.",
    seePool: "ver pool ↗",
    action: "Ação",
    buy: "Comprar",
    sell: "Vender",
    pay: (sym) => `Você paga em ${sym}`,
    selling: (sym) => `Você vende $${sym}`,
    balance: "saldo",
    receive: "Você recebe",
    impact: "Impacto no preço",
    poolFee: "Taxa 0,3% da Soroswap",
    curveFee: "Taxa 1% (½ criador · ¼ vault e holders · ¼ protocolo)",
    slippage: "Slippage máx.",
    slippageLabel: "Slippage máximo",
    fills: "Cobrado (completa a curva)",
    submit: (buy, sym) => `${buy ? "Comprar" : "Vender"} $${sym}`,
    getIt: (etherfuse, aquarius) => (
      <>
        Consiga na {etherfuse} ou na {aquarius}
      </>
    ),
    retry: (pct) => `Tentar com ${pct}%`,
    buyback: "Recompra e queima",
    buybackNote: (sym) => `O vault gasta até 1% da reserva do pool em $${sym} e o queima. Qualquer um pode chamá-lo.`,
    buybackDo: (sym) => `Recomprar e queimar $${sym}`,
  },

  dividendPanel: {
    title: "Dividendos",
    paid: (amount, sym) => `${amount} ${sym} distribuídos`,
    note: (meme, sym) => `Cada compra e venda na curva paga parte da taxa a quem já tinha $${meme}, conforme quanto tinha, em ${sym}.`,
    yours: "Sua parte",
    claim: (sym) => `Resgatar ${sym}`,
    logClaim: (amount, sym, meme) => `resgatou ${amount} ${sym} de $${meme}`,
  },

  profile: {
    title: "Seu perfil",
    changePhoto: "Trocar foto",
    change: "Trocar",
    badImage: "Não consegui ler essa imagem.",
    name: "Seu nome",
    nameLabel: "Nome",
    copied: "copiado ✓",
    removePhoto: "remover foto",
    uploadPhoto: "enviar foto",
    bio: "Bio: de quais memes você gosta, no que está apostando…",
    local: "Seu perfil fica só neste navegador.",
    worth: "Valor em memes e títulos",
    pnl: "P&L em memes",
    pnlNote: " · em USD no câmbio de hoje",
    seeDividends: "Ver seus dividendos",
    bonds: "Títulos",
    yourMemes: "Seus memes",
    noCost: "custo desconhecido",
    realized: (v) => `realizado ${v}`,
    sellAll: (out) => `se vender tudo ~${out}`,
    onSoroswap: "na Soroswap: esses trades não contam aqui",
    noMemes: "Você ainda não tem memes. Consiga um título e compre o primeiro.",
    created: "Criados por você",
    claim: "resgatar",
    logClaim: (sym) => `resgatou as taxas de $${sym}`,
    disconnect: "Desconectar",
  },

  deposit: {
    done: "Pronto",
    working: "Depositando",
    empty: "O faucet ficou sem títulos por enquanto. Tente mais tarde.",
    inWallet: "já estão na sua carteira",
    simulatedShort: "Depósito simulado com nosso faucet da testnet.",
    seeTx: "ver transação ↗",
    trade: "Bora operar",
    simulated: "Depósito simulado",
    simulatedNote:
      "A Hooks roda na testnet: não recebemos dinheiro. Nosso faucet envia títulos de sandbox da Etherfuse para você testar. Em produção, a Etherfuse recebe seus reais por Pix ou transferência e envia o título de verdade.",
    bond: "Título",
    wouldPay: "Você depositaria",
    receive: "Você recebe",
    submit: (fiat) => `Simular depósito${fiat ? ` de ${fiat}` : ""}`,
    checking: "Verificando sua carteira…",
    preparing: (sym) => `Preparando sua carteira para receber ${sym}…`,
    sending: (n, sym) => `Enviando ${n} ${sym} do faucet…`,
    logReceived: (n, sym) => `recebeu ${n} ${sym}`,
  },

  create: {
    loginFirst: "Entre com sua carteira primeiro (no canto superior direito).",
    nameAndTicker: "Dê um nome e um ticker.",
    deploying: "Publicando seu token…",
    logCreated: (sym) => `criou $${sym}`,
    couponLabel: "Classificado · preencha à mão",
    kicker: "Classificados · Novas emissões",
    title: "Publique seu meme",
    deck: "Sai na edição de hoje, com a reserva em um título soberano.",
    name: "Nome",
    ticker: "Ticker",
    backing: "Lastro da reserva",
    devBuy: (sym) => `Compra inicial em ${sym} (opcional)`,
    devBuyNote: "Comprado na mesma transação, antes de todo mundo.",
    cost: (amount, sym) => `Criar custa ${amount} ${sym}, que vão para o vault da sua moeda: metade é distribuída aos holders.`,
    submit: "Publicar meu meme",
    preview: "Assim vai sair impresso",
    now: "agora",
    finePrint: "Letras miúdas",
    fine: (sym) => [
      "Supply fixo de 1B: 800M são vendidos na curva.",
      `A reserva fica em ${sym}, que rende mesmo sem ninguém operar.`,
      "Quando os 800M são vendidos, a liquidez vai para a Soroswap e fica travada.",
      `Você recebe 0,5% de cada compra e venda na curva, em ${sym}.`,
      `Outros 0,25% vão para o vault da sua moeda: metade é distribuída aos holders em ${sym} e o resto, após a graduação, recompra e queima.`,
      "A foto é buscada pelo nome na Wikipédia; enquanto não dá para enviar imagens, escolha um nome que possa ser fotografado.",
    ],
  },

  dividends: {
    title: "Seus dividendos",
    claiming: (i, n) => `Resgatando ${i} de ${n}…`,
    owed: (amount, what) => `${amount} para resgatar em ${what}`,
    memes: (n) => `${n} memes`,
    everyTrade: (what) => `Cada compra e venda de ${what} te paga no título`,
    yourMemes: (n) => `seus ${n} memes`,
    loginFirst: "Entre com sua carteira, no canto superior direito, para ver quanto cada meme seu te deve.",
    none: "Você ainda não tem memes. Quem tem um meme leva parte das taxas, no título que o lastreia e conforme quanto tem.",
    seeMemes: "Ver memes",
    toClaim: "Para resgatar",
    claimAll: (n) => `Resgatar os ${n}`,
    how: "Como funciona",
    fine: [
      "Cada compra e venda na curva paga 1%; um quarto vai para o vault do meme.",
      "Metade do que entra no vault é de quem tem o meme, conforme quanto tem. A outra metade recompra e queima.",
      "É distribuído na mesma compra ou venda, conforme o que cada um tinha antes dela.",
      "Resgatar envia o título para sua carteira, onde ele continua rendendo.",
    ],
    holds: (n, sym) => `você tem ${n} · paga em ${sym}`,
    nothing: "Nada por enquanto",
    claim: "Resgatar",
  },

  og: {
    backedBy: (sym, label) => `Lastreada em ${sym}, ${label}`,
    reserve: "Reserva",
    yields: "Rende",
    perYear: (rate) => `${rate}% ao ano`,
    curve: "Curva",
  },

  faucet: {
    noFaucet: "Não há faucet na mainnet.",
    notConfigured: "O faucet não está configurado.",
    tooMany: "Você já pediu vários depósitos nesta hora. Tente de novo mais tarde.",
    unknownBond: "Esse título não está no faucet.",
    badAddress: "Endereço inválido.",
    noTrustline: (sym) => `Sua conta ainda não aceita ${sym}.`,
    enough: (sym) => `Você já tem ${sym} suficiente para testar.`,
    rejected: "A rede recusou o envio. Tente de novo.",
    failed: "O envio falhou on-chain.",
    dry: (sym) => `O faucet ficou sem ${sym} ou não responde.`,
  },

  errors: {
    slippage: "O preço se moveu mais que seu slippage. Aumente e tente de novo.",
    contract: {
      1: "Esse par não é permitido.",
      3: "Essa memecoin não existe.",
      4: "Valor inválido.",
      6: "Esta memecoin já se graduou: agora opera na Soroswap.",
      7: "Só o criador pode resgatar essas taxas.",
      8: "Nome (1–32) ou ticker (1–12) inválido.",
      9: "Não há taxas para resgatar.",
      10: "Seu saldo não é suficiente.",
      11: "A curva ainda não foi vendida por completo.",
      12: "O pool na Soroswap já está aberto.",
      13: "Sua conta ainda não aceita este token: falta a trustline.",
      14: "Falta XLM na sua conta para a reserva da trustline.",
      15: "Esta memecoin ainda não tem pool na Soroswap.",
      16: "O vault de recompra está vazio.",
      201: "Você não tem dividendos para resgatar.",
      202: "Esse endereço não é um pool desta memecoin.",
    },
    contractOther: (code) => `Erro do contrato #${code}.`,
    timeout: "A operação demorou demais para ser assinada. Tente de novo.",
    cancelled: "Você cancelou a transação.",
    policy: "A política do app na Cavos não permite esta transação.",
    app: {
      invalidAmount: "Valor inválido",
      notConnected: "Conecte uma carteira primeiro.",
      cavosNotConnected: "Carteira Cavos não conectada.",
      cavosApprove: "Este dispositivo ainda não pode assinar. Saia e entre de novo com o mesmo e-mail ou Google para restaurar sua carteira aqui.",
      cavosNoRecovery: "Sua carteira ainda não tem backup. Abra-a no dispositivo onde você a criou, saia e entre de novo lá, e depois entre de novo neste.",
      noMainnetAccount: "Sua conta ainda não existe na mainnet: precisa de XLM.",
      networkRejected: "A rede recusou a transação.",
      txFailed: "A transação falhou on-chain.",
      txTimeout: "A transação não foi confirmada a tempo.",
    },
  },
};
