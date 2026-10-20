export const REELS = 5;
export const ROWS = 3;
export const LINE_COUNT = 20;

export const SYMBOLS = [
  "ten",
  "jack",
  "queen",
  "king",
  "ace",
  "sakura",
  "fan",
  "lantern",
  "rin",
  "aoi",
  "hana",
  "mika",
  "wild",
  "scatter",
] as const;

export type Sym = (typeof SYMBOLS)[number];

export const BETS = [20, 40, 100, 200, 500] as const;
export const START_BALANCE = 2500;
export const FS_MULT = 2;

/** Pay in line-bet units for 0..5 of a kind. Left to right, min 3. */
export const PAY: Record<Sym, readonly number[]> = {
  ten: [0, 0, 0, 16, 40, 110],
  jack: [0, 0, 0, 16, 48, 130],
  queen: [0, 0, 0, 24, 64, 170],
  king: [0, 0, 0, 32, 80, 220],
  ace: [0, 0, 0, 40, 100, 280],
  sakura: [0, 0, 0, 56, 150, 440],
  fan: [0, 0, 0, 72, 190, 600],
  lantern: [0, 0, 0, 96, 260, 800],
  rin: [0, 0, 0, 120, 320, 1000],
  aoi: [0, 0, 0, 160, 440, 1400],
  hana: [0, 0, 0, 200, 600, 2000],
  mika: [0, 0, 0, 280, 900, 3200],
  wild: [0, 0, 0, 320, 1200, 4800],
  scatter: [0, 0, 0, 0, 0, 0],
};

export const SCATTER: Record<number, { pay: number; spins: number }> = {
  3: { pay: 2, spins: 8 },
  4: { pay: 10, spins: 12 },
  5: { pay: 40, spins: 20 },
};

export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 2, 1, 0, 2],
];

const WEIGHTS: Record<Sym, number>[] = [
  { ten: 14, jack: 12, queen: 10, king: 8, ace: 7, sakura: 5, fan: 4, lantern: 3, rin: 3, aoi: 2, hana: 2, mika: 1, wild: 1, scatter: 3 },
  { ten: 13, jack: 11, queen: 10, king: 8, ace: 7, sakura: 5, fan: 4, lantern: 3, rin: 3, aoi: 2, hana: 2, mika: 1, wild: 2, scatter: 3 },
  { ten: 12, jack: 10, queen: 9, king: 8, ace: 7, sakura: 5, fan: 4, lantern: 4, rin: 3, aoi: 2, hana: 2, mika: 2, wild: 2, scatter: 3 },
  { ten: 13, jack: 11, queen: 10, king: 8, ace: 7, sakura: 5, fan: 4, lantern: 3, rin: 3, aoi: 2, hana: 2, mika: 1, wild: 2, scatter: 3 },
  { ten: 14, jack: 12, queen: 10, king: 8, ace: 7, sakura: 5, fan: 4, lantern: 3, rin: 3, aoi: 2, hana: 2, mika: 1, wild: 1, scatter: 3 },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStrip(weights: Record<Sym, number>, seed: number): Sym[] {
  const bag: Sym[] = [];
  for (const sym of SYMBOLS) {
    for (let i = 0; i < weights[sym]; i++) bag.push(sym);
  }
  const rng = mulberry32(seed);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j]!;
    bag[j] = tmp!;
  }
  const len = bag.length;
  for (let i = 0; i < len; i++) {
    if (bag[i] === "scatter" && bag[(i + 1) % len] === "scatter") {
      for (let k = 2; k < len; k++) {
        const j = (i + k) % len;
        if (bag[j] !== "scatter" && bag[(j + 1) % len] !== "scatter" && bag[(j - 1 + len) % len] !== "scatter") {
          const tmp = bag[(i + 1) % len]!;
          bag[(i + 1) % len] = bag[j]!;
          bag[j] = tmp;
          break;
        }
      }
    }
  }
  return bag;
}

export const STRIPS: Sym[][] = WEIGHTS.map((w, i) => buildStrip(w, 9001 + i * 17));

export function lineAmount(sym: Sym, count: number, totalBet: number, mult = 1): number {
  const lineBet = totalBet / LINE_COUNT;
  return Math.round(PAY[sym][count]! * lineBet * mult * 0.88);
}

export function windowAt(strip: Sym[], stop: number, count = ROWS): Sym[] {
  const out: Sym[] = [];
  for (let i = 0; i < count; i++) out.push(strip[(stop + i) % strip.length]!);
  return out;
}

export function spinReels(rng: () => number = Math.random): { stops: number[]; grid: Sym[][] } {
  const stops = STRIPS.map((strip) => Math.floor(rng() * strip.length));
  const grid = stops.map((stop, r) => windowAt(STRIPS[r]!, stop));
  return { stops, grid };
}

export function travelFor(from: number, to: number, length: number, minSteps: number): number {
  let d = (to - from + length) % length;
  while (d < minSteps) d += length;
  return d;
}

export type LineWin = {
  index: number;
  symbol: Sym;
  count: number;
  amount: number;
};

export type Evaluation = {
  lines: LineWin[];
  scatterCount: number;
  scatterPay: number;
  freeSpins: number;
  total: number;
  /** Winning cells, reel-major. */
  mask: boolean[][];
  best: Sym | null;
};

const RANK: Sym[] = ["mika", "hana", "aoi", "rin", "wild", "lantern", "fan", "sakura", "ace", "king", "queen", "jack", "ten"];

function better(a: Sym | null, b: Sym): Sym {
  if (!a) return b;
  return RANK.indexOf(b) < RANK.indexOf(a) ? b : a;
}

export function evaluate(grid: Sym[][], totalBet: number, mult = 1): Evaluation {
  const lines: LineWin[] = [];
  const mask = grid.map((col) => col.map(() => false));
  let best: Sym | null = null;

  PAYLINES.forEach((rows, index) => {
    const picked = rows.map((row, reel) => grid[reel]![row]!);
    if (picked[0] === "scatter") return;
    let base: Sym | null = null;
    for (const s of picked) {
      if (s !== "wild") {
        base = s;
        break;
      }
    }
    if (base === "scatter") return;
    const sym: Sym = base ?? "wild";
    let count = 0;
    for (const s of picked) {
      if (s === sym || s === "wild") count++;
      else break;
    }
    if (count < 3) return;
    const amount = lineAmount(sym, count, totalBet, mult);
    if (amount <= 0) return;
    lines.push({ index, symbol: sym, count, amount });
    for (let reel = 0; reel < count; reel++) mask[reel]![rows[reel]!] = true;
    if (sym !== "wild") best = better(best, sym);
    else best = better(best, "wild");
  });

  let scatterCount = 0;
  grid.forEach((col) => {
    col.forEach((s) => {
      if (s === "scatter") scatterCount++;
    });
  });
  const bonus = SCATTER[scatterCount];
  const scatterPay = bonus ? bonus.pay * totalBet : 0;
  const freeSpins = bonus ? bonus.spins : 0;
  if (freeSpins) {
    grid.forEach((col, reel) => {
      col.forEach((s, row) => {
        if (s === "scatter") mask[reel]![row] = true;
      });
    });
  }

  const lineTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  return {
    lines,
    scatterCount,
    scatterPay,
    freeSpins,
    total: lineTotal + scatterPay,
    mask,
    best,
  };
}

export type Tier = "none" | "win" | "big" | "mega" | "aurora";

export function tierFor(total: number, bet: number): Tier {
  if (total <= 0 || bet <= 0) return "none";
  const x = total / bet;
  if (x >= 80) return "aurora";
  if (x >= 28) return "mega";
  if (x >= 10) return "big";
  return "win";
}

export function slotEase(t: number): number {
  if (t < 0.58) return (t / 0.58) * 0.7;
  const u = (t - 0.58) / 0.42;
  return 0.7 + (1 - (1 - u) ** 3) * 0.3;
}

/** Monte Carlo for tuning. Counts free-spin spins inside the budget. */
export function simulate(spins: number, bet = 100, rng: () => number = Math.random) {
  let wagered = 0;
  let returned = 0;
  let triggers = 0;
  let fsLeft = 0;
  let played = 0;
  while (played < spins || fsLeft > 0) {
    if (played >= spins && fsLeft <= 0) break;
    const inFs = fsLeft > 0;
    if (inFs) fsLeft--;
    else {
      if (played >= spins) break;
      wagered += bet;
      played++;
    }
    const { grid } = spinReels(rng);
    const ev = evaluate(grid, bet, inFs ? FS_MULT : 1);
    returned += ev.total;
    if (ev.freeSpins) {
      triggers++;
      fsLeft = Math.min(40, fsLeft + ev.freeSpins);
    }
    if (played > spins + 5 && fsLeft > 80) break;
  }
  return {
    rtp: wagered ? returned / wagered : 0,
    triggers,
    baseSpins: played,
    wagered,
    returned,
  };
}
