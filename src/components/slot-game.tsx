import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Info, Minus, Plus, Volume2, VolumeX, Zap } from "lucide-react";
import { ParticleField } from "@/components/particle-field";
import { Reel, type ReelRun } from "@/components/reel";
import { GIFTS, IDOLS, SYMBOL_ART, SYMBOL_NAME, idolFor, money, type GiftId, type Idol } from "@/game/content";
import { MACHINES, machineById, type Machine, type MachineId } from "@/game/machines";
import {
  playClick,
  playScatter,
  playSpin,
  playStop,
  playWin,
  resumeAudio,
  setMuted,
  startMusic,
  stopMusic,
  unlockAudio,
} from "@/game/audio";
import {
  BETS,
  FS_MULT,
  LINE_COUNT,
  PAYLINES,
  REELS,
  SCATTER,
  START_BALANCE,
  STRIPS,
  SYMBOLS,
  evaluate,
  lineAmount,
  spinReels,
  tierFor,
  travelFor,
  windowAt,
  type Evaluation,
  type Sym,
  type Tier,
} from "@/game/logic";

const KEY = "aurora-idol-v1";
const GAP = 8;
const EMPTY: boolean[][] = Array.from({ length: REELS }, () => [false, false, false]);

type Feat =
  | { kind: "privat"; idol: Idol; gift: GiftId; mult: number }
  | { kind: "climb" | "expand" | "mirror"; idol: Idol; mult: number };
type Save = { v: 1; balance: number; bet: number; sound: boolean; best: number };

const teaseAt = (idol: Idol, n: number) => idol.tease[n % idol.tease.length] ?? idol.line;

function showcaseStop(strip: Sym[], wanted: Sym): number {
  let fallback = 0;
  for (let i = 0; i < strip.length; i++) {
    if (strip[(i + 1) % strip.length] !== wanted) continue;
    fallback = i;
    const top = strip[i];
    const bot = strip[(i + 2) % strip.length];
    if (top !== wanted && bot !== wanted) return i;
  }
  return fallback;
}

function loadSave(): Save {
  const fallback: Save = { v: 1, balance: START_BALANCE, bet: 40, sound: true, best: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Save>;
    if (parsed.v !== 1 || typeof parsed.balance !== "number") return fallback;
    const bet = BETS.includes(parsed.bet as (typeof BETS)[number]) ? (parsed.bet as number) : 40;
    return {
      v: 1,
      balance: Math.max(0, Math.floor(parsed.balance)),
      bet,
      sound: parsed.sound !== false,
      best: typeof parsed.best === "number" ? parsed.best : 0,
    };
  } catch {
    return fallback;
  }
}

function tierTitle(tier: Tier): string | null {
  if (tier === "big") return "BIG WIN";
  if (tier === "mega") return "MEGA WIN";
  if (tier === "aurora") return "AURORA";
  return null;
}

function winLevel(tier: Tier): 1 | 2 | 3 | 4 {
  if (tier === "aurora") return 4;
  if (tier === "mega") return 3;
  if (tier === "big") return 2;
  return 1;
}

export function AuroraIdol() {
  const [entered, setEntered] = useState(false);
  const [machine, setMachine] = useState<MachineId | null>(null);
  if (!entered) {
    return (
      <Intro
        onEnter={() => {
          unlockAudio();
          startMusic();
          setEntered(true);
        }}
      />
    );
  }
  if (!machine) return <Hall onPick={setMachine} />;
  return <Cabinet key={machine} machine={machineById(machine)} onLeave={() => setMachine(null)} />;
}

function Intro({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="app">
      <div className="bg" />
      <ParticleField burst={0} />
      <main className="intro">
        <p className="kicker">Neon Reels</p>
        <h1>
          <span>Aurora</span>
          <span>Idol</span>
        </h1>
        <p className="lede">Vier Automaten, ein Guthaben. Jede Bühne zahlt anders.</p>
        <div className="cast">
          {IDOLS.slice(0, 4).map((idol) => (
            <figure key={idol.sym}>
              <img src={idol.img} alt={idol.name} />
              <figcaption>{idol.name}</figcaption>
            </figure>
          ))}
        </div>
        <button type="button" className="cta" onClick={onEnter}>
          Bühne betreten
        </button>
        <p className="fine">Nur Spielgeld · kein Echtgeld · Unterhaltung ab 18</p>
      </main>
    </div>
  );
}

function Hall({ onPick }: { onPick: (id: MachineId) => void }) {
  return (
    <div className="app">
      <div className="bg" />
      <main className="hall">
        <p className="kicker">Spielhalle</p>
        <h1>Wähl eine Bühne</h1>
        <div className="hall-grid">
          {MACHINES.map((machine) => {
            const host = idolFor(machine.host);
            return (
              <button key={machine.id} type="button" className="hall-card" onClick={() => onPick(machine.id)}>
                <img src={host.encore} alt="" />
                <span>
                  <em className="kicker">{machine.kicker}</em>
                  <strong>{machine.name}</strong>
                  <small>{machine.bonus}</small>
                </span>
              </button>
            );
          })}
        </div>
        <p className="fine">Ein Guthaben für alle Automaten. Nur Spielgeld.</p>
      </main>
    </div>
  );
}

function Cabinet({ machine, onLeave }: { machine: Machine; onLeave: () => void }) {
  const save = useRef(loadSave());
  const initialStops = [
    showcaseStop(STRIPS[0]!, "mika"),
    showcaseStop(STRIPS[1]!, "hana"),
    showcaseStop(STRIPS[2]!, "rin"),
    showcaseStop(STRIPS[3]!, "aoi"),
    showcaseStop(STRIPS[4]!, "wild"),
  ];
  const [stops, setStops] = useState<number[]>(initialStops);
  const [runs, setRuns] = useState<(ReelRun | null)[]>(() => Array.from({ length: REELS }, () => null));
  const [mask, setMask] = useState<boolean[][]>(EMPTY);
  const [dim, setDim] = useState(false);
  const [balance, setBalance] = useState(save.current.balance);
  const [shown, setShown] = useState(save.current.balance);
  const [bet, setBet] = useState(save.current.bet);
  const [sound, setSound] = useState(save.current.sound);
  const [best, setBest] = useState(save.current.best);
  const [fsLeft, setFsLeft] = useState(0);
  const [auto, setAuto] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feature, setFeature] = useState(() => Math.max(0, IDOLS.findIndex((idol) => idol.sym === machine.host)));
  const [note, setNote] = useState(machine.bonus);
  const [lastWin, setLastWin] = useState(0);
  const [line, setLine] = useState<number | null>(null);
  const [wins, setWins] = useState<Evaluation["lines"]>([]);
  const [banner, setBanner] = useState<{ title: string; detail: string; idol: Idol } | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const [cell, setCell] = useState(96);
  const [board, setBoard] = useState({ w: 0, h: 0 });
  const [anticipate, setAnticipate] = useState<boolean[]>(() => Array.from({ length: REELS }, () => false));
  const [encore, setEncore] = useState<Feat | null>(null);
  const [picker, setPicker] = useState<{ idol: Idol; spins: number } | null>(null);
  const [faces, setFaces] = useState<Sym[][] | null>(null);
  const [reduced, setReduced] = useState(false);

  const balanceRef = useRef(save.current.balance);
  const betRef = useRef(save.current.bet);
  const autoRef = useRef(false);
  const turboRef = useRef(false);
  const stopRef = useRef(initialStops);
  const fsRef = useRef(0);
  const phase = useRef<"idle" | "spinning" | "presenting">("idle");
  const tokenRef = useRef(0);
  const doneRef = useRef<Set<number>>(new Set());
  const finals = useRef<number[]>(initialStops);
  const pending = useRef<Evaluation | null>(null);
  const skipRef = useRef<(() => void) | null>(null);
  const alive = useRef(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const encoreRef = useRef<Feat | null>(null);
  const encoreWin = useRef(0);
  const teaseN = useRef(0);
  const pickRef = useRef<((gift: GiftId) => void) | null>(null);
  const needRef = useRef(REELS);
  const facesRef = useRef<Sym[][] | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const trauma = useRef(0);
  const shownRef = useRef(save.current.balance);
  const spinRef = useRef<() => void>(() => {});

  useEffect(() => {
    alive.current = true;
    setMuted(!save.current.sound);
    if (save.current.sound) startMusic();
    else stopMusic();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMotion = () => setReduced(mq.matches);
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    mq.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive.current = false;
      pickRef.current?.("near");
      mq.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const payload: Save = { v: 1, balance, bet, sound, best };
    localStorage.setItem(KEY, JSON.stringify(payload));
  }, [balance, bet, sound, best]);

  useEffect(() => {
    const from = shownRef.current;
    const to = balance;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 480);
      const v = Math.round(from + (to - from) * (1 - (1 - t) ** 3));
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [balance]);

  useEffect(() => {
    if (busy || encore) return;
    const id = window.setInterval(() => setFeature((n) => (n + 1) % IDOLS.length), 7200);
    return () => window.clearInterval(id);
  }, [busy, encore, feature]);

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      const w = el.clientWidth;
      const next = h / 3;
      setCell((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
      setBoard((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const node = shellRef.current;
      if (node && trauma.current > 0 && !reduced) {
        trauma.current = Math.max(0, trauma.current - dt * 1.7);
        const s = trauma.current * trauma.current;
        const x = (Math.random() * 2 - 1) * 10 * s;
        const y = (Math.random() * 2 - 1) * 6 * s;
        node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      } else if (node) node.style.transform = "";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  useEffect(() => {
    if (!wins.length) {
      setLine(null);
      return;
    }
    let i = 0;
    setLine(wins[0]!.index);
    const id = window.setInterval(() => {
      i = (i + 1) % wins.length;
      setLine(wins[i]!.index);
    }, 1000);
    return () => window.clearInterval(id);
  }, [wins]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      if (payOpen || picker) return;
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "BUTTON") return;
      e.preventDefault();
      spinRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [payOpen, picker]);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const finish = () => {
        window.clearTimeout(timer);
        skipRef.current = null;
        resolve();
      };
      const timer = window.setTimeout(finish, ms);
      skipRef.current = finish;
    });

  const bump = (amount: number) => {
    if (reduced) return;
    trauma.current = Math.min(1, trauma.current + amount);
  };

  const clearBoard = () => {
    setMask(EMPTY);
    setDim(false);
    setWins([]);
    setLine(null);
    setAnticipate(Array.from({ length: REELS }, () => false));
    setFaces(null);
  };

  const present = async (ev: Evaluation, stake: number) => {
    phase.current = "presenting";
    setBusy(true);
    if (ev.best) {
      const idx = IDOLS.findIndex((idol) => idol.sym === ev.best);
      if (idx >= 0) setFeature(idx);
    }
    if (ev.total > 0) {
      setMask(ev.mask);
      setDim(true);
      setWins(ev.lines);
      setLastWin(ev.total);
      setBest((n) => Math.max(n, ev.total));
      balanceRef.current += ev.total;
      setBalance(balanceRef.current);
      if (encoreRef.current) encoreWin.current += ev.total;
      const tier = tierFor(ev.total, stake);
      playWin(winLevel(tier));
      const idol = idolFor(ev.best);
      setNote(`${idol.name}: +${money.format(ev.total)}`);
      const title = tierTitle(tier);
      if (title) {
        setBurst((n) => n + 1);
        bump(tier === "aurora" ? 0.85 : tier === "mega" ? 0.6 : 0.38);
        setBanner({ title, detail: `+${money.format(ev.total)}`, idol });
        await wait(reduced ? 500 : 1700);
        if (!alive.current) return;
        setBanner(null);
      } else {
        bump(0.14);
        await wait(reduced ? 250 : 720);
        if (!alive.current) return;
      }
    } else {
      setNote("Daneben. Die Bühne bleibt an.");
      setLastWin(0);
      await wait(260);
      if (!alive.current) return;
    }

    if (encoreRef.current?.kind === "climb") {
      const mult = ev.total > 0 ? Math.min(8, encoreRef.current.mult + 1) : 2;
      const next = { ...encoreRef.current, mult };
      encoreRef.current = next;
      setEncore(next);
    }

    if (ev.freeSpins && !encoreRef.current) {
      const host = machine.kind === "privat"
        ? IDOLS.some((entry) => entry.sym === ev.best)
          ? idolFor(ev.best)
          : idolFor(IDOLS[feature]?.sym ?? machine.host)
        : idolFor(machine.host);
      setMask(ev.mask);
      setDim(true);
      setBurst((n) => n + 1);
      if (machine.kind === "privat") {
        setPicker({ idol: host, spins: ev.freeSpins });
        const giftId = await new Promise<GiftId>((resolve) => {
          pickRef.current = resolve;
        });
        pickRef.current = null;
        if (!alive.current) return;
        const gift = GIFTS.find((entry) => entry.id === giftId) ?? GIFTS[0]!;
        const spins = Math.min(40, ev.freeSpins + gift.extra);
        fsRef.current = spins;
        setFsLeft(spins);
        const next: Feat = { kind: "privat", idol: host, gift: gift.id, mult: gift.mult };
        encoreRef.current = next;
        encoreWin.current = 0;
        teaseN.current = 0;
        setEncore(next);
        setPicker(null);
        const idx = IDOLS.findIndex((entry) => entry.sym === host.sym);
        if (idx >= 0) setFeature(idx);
        setNote(`${host.name}: ${gift.line}`);
        setBanner({ title: "PRIVATBÜHNE", detail: gift.line, idol: { ...host, img: host.encore } });
      } else {
        const spins = Math.min(40, ev.freeSpins);
        fsRef.current = spins;
        setFsLeft(spins);
        const title = machine.kind === "climb" ? "KETTENLICHT" : machine.kind === "expand" ? "VOLLMOND" : "DUETT";
        const next: Feat = { kind: machine.kind, idol: host, mult: 2 };
        encoreRef.current = next;
        encoreWin.current = 0;
        teaseN.current = 0;
        setEncore(next);
        const idx = IDOLS.findIndex((entry) => entry.sym === host.sym);
        if (idx >= 0) setFeature(idx);
        setNote(`${host.name}: ${machine.bonus}`);
        setBanner({ title, detail: machine.bonus, idol: { ...host, img: host.encore } });
      }
      await wait(reduced ? 400 : 1100);
      if (!alive.current) return;
      setBanner(null);
    } else if (ev.freeSpins) {
      fsRef.current = Math.min(40, fsRef.current + ev.freeSpins);
      setFsLeft(fsRef.current);
      const host = encoreRef.current?.idol;
      setNote(host ? `${host.name}: Bleib. Noch ${ev.freeSpins}.` : `${ev.freeSpins} Freispiele`);
    }

    const closing = encoreRef.current && fsRef.current === 0 ? encoreRef.current : null;
    const curtain = encoreWin.current;
    if (closing) {
      encoreRef.current = null;
      setEncore(null);
      setBanner({
        title: closing.kind === "climb" ? "KETTE AUS" : closing.kind === "expand" ? "MOND UNTER" : closing.kind === "mirror" ? "DUETT AUS" : "VORHANG",
        detail: `${closing.idol.name} · +${money.format(curtain)}`,
        idol: { ...closing.idol, img: closing.idol.encore },
      });
      await wait(reduced ? 400 : 1400);
      if (!alive.current) return;
      setBanner(null);
    }

    clearBoard();
    phase.current = "idle";
    setBusy(false);
    if (fsRef.current > 0 || autoRef.current) {
      await wait(fsRef.current > 0 ? 380 : 260);
      if (!alive.current) return;
      if (phase.current === "idle") spinRef.current();
    }
  };

  const spin = () => {
    if (phase.current === "presenting") {
      skipRef.current?.();
      return;
    }
    if (phase.current !== "idle") return;
    const stake = betRef.current;
    const inFs = fsRef.current > 0;
    const featureNow = encoreRef.current;
    if (!inFs && balanceRef.current < stake) {
      setNote("Guthaben leer — Zugabe holen.");
      return;
    }
    unlockAudio();
    playSpin();
    if (inFs) {
      fsRef.current -= 1;
      setFsLeft(fsRef.current);
    } else {
      balanceRef.current -= stake;
      setBalance(balanceRef.current);
    }
    phase.current = "spinning";
    setBusy(true);
    clearBoard();
    if (inFs && featureNow) setNote(`${featureNow.idol.name}: ${teaseAt(featureNow.idol, teaseN.current++)}`);
    else setNote("Walzen laufen…");
    const { stops: next, grid } = spinReels();
    const locked = !!featureNow && featureNow.kind === "privat" && featureNow.gift === "wild";
    let played = grid.map((col) => col.slice());
    if (inFs && locked) played[2] = ["wild", "wild", "wild"];
    if (inFs && featureNow?.kind === "expand") {
      played = played.map((col) => (col.includes("wild") ? (["wild", "wild", "wild"] as Sym[]) : col));
    }
    if (inFs && featureNow?.kind === "mirror") {
      played[3] = played[1]!.slice();
      played[4] = played[0]!.slice();
    }
    facesRef.current = inFs && featureNow && (featureNow.kind === "expand" || featureNow.kind === "mirror") ? played : null;
    finals.current = next;
    pending.current = evaluate(played, stake, inFs ? (featureNow?.mult ?? FS_MULT) : 1);
    const scatterReels = played.flatMap((col, i) => (col.includes("scatter") ? [i] : []));
    const after = scatterReels.length >= 2 ? scatterReels[1]! : 99;
    setAnticipate(grid.map((_, i) => !locked && i > after));
    const token = ++tokenRef.current;
    needRef.current = locked ? REELS - 1 : REELS;
    doneRef.current = new Set();
    const quick = turboRef.current || reduced;
    setRuns(
      STRIPS.map((strip, i) =>
        locked && i === 2
          ? null
          : {
              id: token,
              from: stopRef.current[i]!,
              travel: travelFor(stopRef.current[i]!, next[i]!, strip.length, (quick ? 8 : 16) + i * (quick ? 2 : 4)),
              duration: (reduced ? 380 : quick ? 560 : 1180) + i * (quick ? 110 : 260) + (i > after ? 700 : 0),
            },
      ),
    );
  };
  spinRef.current = spin;

  const onReelDone = (index: number, id: number) => {
    if (id !== tokenRef.current || doneRef.current.has(index)) return;
    doneRef.current.add(index);
    const stop = finals.current[index]!;
    stopRef.current = stopRef.current.map((value, i) => (i === index ? stop : value));
    setStops(stopRef.current.slice());
    setRuns((prev) => prev.map((run, i) => (i === index ? null : run)));
    const col = windowAt(STRIPS[index]!, stop);
    if (col.includes("scatter")) playScatter();
    else playStop(index);
    bump(0.08);
    if (doneRef.current.size === needRef.current && pending.current) {
      if (facesRef.current) setFaces(facesRef.current);
      const ev = pending.current;
      pending.current = null;
      void present(ev, betRef.current);
    }
  };

  const chooseGift = (id: GiftId) => {
    playClick();
    pickRef.current?.(id);
  };

  const idol = encore?.idol ?? IDOLS[feature] ?? IDOLS[0]!;
  const portrait = encore ? idol.encore : idol.img;
  const needsRefill = fsLeft === 0 && balance < bet;
  const active = wins.find((entry) => entry.index === line);
  const marquee = active
    ? `Linie ${active.index + 1} · ${SYMBOL_NAME[active.symbol]} ×${active.count} · +${money.format(active.amount)}`
    : note;

  const path = (() => {
    if (line == null || board.w <= 0) return "";
    const rows = PAYLINES[line];
    if (!rows) return "";
    const cellW = (board.w - GAP * (REELS - 1)) / REELS;
    const cellH = board.h / 3;
    return rows
      .map((row, i) => {
        const x = i * (cellW + GAP) + cellW / 2;
        const y = row * cellH + cellH / 2;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  })();

  const changeBet = (dir: number) => {
    if (busy || fsLeft > 0) return;
    const idx = Math.min(BETS.length - 1, Math.max(0, BETS.indexOf(bet as (typeof BETS)[number]) + dir));
    const next = BETS[idx] ?? bet;
    betRef.current = next;
    setBet(next);
    playClick();
  };

  const refill = () => {
    balanceRef.current = START_BALANCE;
    setBalance(START_BALANCE);
    setNote("Zugabe. Die Nacht geht weiter.");
    playClick();
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setMuted(!next);
    if (next) {
      unlockAudio();
      startMusic();
    } else stopMusic();
  };

  return (
    <div className={encore ? "app encore" : "app"}>
      <div className="bg" />
      <ParticleField burst={burst} />
      <div className="shell" ref={shellRef}>
        <header className="top">
          <button type="button" className="hall-back" onClick={onLeave} disabled={busy || fsLeft > 0}>
            Halle
          </button>
          <div className="brand">
            <span className="kicker">{machine.kicker}</span>
            <strong>{machine.name}</strong>
          </div>
          <div className="meters">
            <span>
              <small>Guthaben</small>
              {money.format(shown)}
            </span>
            <span>
              <small>Bester Treffer</small>
              {money.format(best)}
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={toggleSound} aria-label={sound ? "Ton aus" : "Ton an"}>
            {sound ? <Volume2 /> : <VolumeX />}
          </button>
        </header>

        <div className="layout">
          <aside className="hero">
            <button type="button" className="portrait" onClick={() => setFeature((n) => (n + 1) % IDOLS.length)} disabled={!!encore}>
              <img src={portrait} alt={idol.name} />
            </button>
            <div className="hero-copy">
              <p className="kicker">{idol.role}</p>
              <h2>{idol.name}</h2>
              <p>{idol.line}</p>
            </div>
          </aside>

          <section className="cabinet" aria-label="Spielautomat">
            <div className="marquee" aria-live="polite">
              {marquee}
            </div>
            <div className="board" ref={boardRef}>
              {STRIPS.map((strip, i) => (
                <Reel
                  key={i}
                  strip={strip}
                  stop={stops[i] ?? 0}
                  run={runs[i] ?? null}
                  cell={cell}
                  wins={mask[i] ?? [false, false, false]}
                  dim={dim}
                  anticipate={!!anticipate[i]}
                  reduced={reduced}
                  hold={i === 2 && encore?.kind === "privat" && encore.gift === "wild" && (fsLeft > 0 || busy)}
                  faces={faces?.[i] ?? null}
                  onDone={(id) => onReelDone(i, id)}
                />
              ))}
              {path ? (
                <svg className="lines" viewBox={`0 0 ${board.w} ${board.h}`} aria-hidden="true">
                  <path d={path} />
                </svg>
              ) : null}
            </div>
            <div className="status">
              {fsLeft > 0 ? (
                <b>
                  {encore ? `${encore.idol.name} · ` : ""}
                  {machine.name} {fsLeft} · ×{encore?.mult ?? FS_MULT}
                </b>
              ) : (
                <span>Letzter Gewinn {money.format(lastWin)}</span>
              )}
              <span>20 Linien</span>
            </div>
            <div className="controls">
              <div className="bet">
                <button type="button" onClick={() => changeBet(-1)} disabled={busy || fsLeft > 0} aria-label="Einsatz senken">
                  <Minus />
                </button>
                <span>
                  <small>Einsatz</small>
                  {money.format(bet)}
                </span>
                <button type="button" onClick={() => changeBet(1)} disabled={busy || fsLeft > 0} aria-label="Einsatz erhöhen">
                  <Plus />
                </button>
              </div>
              <button
                type="button"
                className="spin"
                aria-label={needsRefill ? "Auffüllen" : busy ? "Weiter" : "Drehen"}
                onClick={() => {
                  if (!busy && needsRefill) refill();
                  else spinRef.current();
                }}
              >
                {needsRefill ? "AUFFÜLLEN" : busy ? "WEITER" : "DREHEN"}
              </button>
              <div className="toggles">
                <button type="button" className={auto ? "on" : ""} onClick={() => { autoRef.current = !auto; setAuto(!auto); playClick(); }}>
                  Auto
                </button>
                <button type="button" className={turbo ? "on" : ""} onClick={() => { turboRef.current = !turbo; setTurbo(!turbo); playClick(); }}>
                  <Zap /> Turbo
                </button>
                <button type="button" onClick={() => { setPayOpen(true); playClick(); }} aria-label="Gewinntabelle">
                  <Info />
                </button>
              </div>
            </div>
            {needsRefill ? (
              <button type="button" className="refill" onClick={refill}>
                Zugabe · {money.format(START_BALANCE)} Spielgeld
              </button>
            ) : null}
          </section>
        </div>
        <p className="fine dock">Nur Spielgeld. Keine Auszahlung. Kein Glücksspiel um Echtgeld.</p>
      </div>

      {picker ? (
        <div className="stage" role="dialog" aria-modal="true" aria-label="Privatbühne">
          <p className="kicker">Privatbühne · {picker.spins} Drehungen</p>
          <img className="stage-hero" src={picker.idol.encore} alt="" />
          <div className="stage-copy">
            <h2>{picker.idol.name}</h2>
            <p>{picker.idol.line}</p>
          </div>
          <div className="stage-picks">
            {GIFTS.map((gift) => (
              <button key={gift.id} type="button" onClick={() => chooseGift(gift.id)}>
                <strong>{gift.title}</strong>
                <span>{gift.line}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {banner ? (
        <div className="banner" role="dialog" aria-label={banner.title}>
          <img src={banner.idol.img} alt="" />
          <div>
            <p className="kicker">{banner.idol.name}</p>
            <h3>{banner.title}</h3>
            <p>{banner.detail}</p>
          </div>
        </div>
      ) : null}

      {payOpen ? (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Gewinntabelle">
          <div className="sheet-card">
            <header>
              <h3>Gewinntabelle</h3>
              <button type="button" onClick={() => setPayOpen(false)}>
                Schließen
              </button>
            </header>
            <p>
              {LINE_COUNT} Linien, Einsatz {money.format(bet)}. Drei oder mehr gleiche Symbole von links. Luna (Wild) ersetzt
              alles außer Zugabe. {machine.rules}
            </p>
            <ul>
              {SYMBOLS.filter((sym) => sym !== "scatter").map((sym) => (
                <li key={sym}>
                  <span className="pay-sym">
                    {SYMBOL_ART[sym] ? <img src={SYMBOL_ART[sym]} alt="" /> : <b>{SYMBOL_NAME[sym]}</b>}
                    {SYMBOL_NAME[sym]}
                  </span>
                  <span>×3 {money.format(lineAmount(sym, 3, bet))}</span>
                  <span>×4 {money.format(lineAmount(sym, 4, bet))}</span>
                  <span>×5 {money.format(lineAmount(sym, 5, bet))}</span>
                </li>
              ))}
              <li>
                <span className="pay-sym">
                  <img src={SYMBOL_ART.scatter} alt="" />
                  Zugabe
                </span>
                <span>×3 {money.format(SCATTER[3]!.pay * bet)} + {SCATTER[3]!.spins} FS</span>
                <span>×4 {money.format(SCATTER[4]!.pay * bet)} + {SCATTER[4]!.spins} FS</span>
                <span>×5 {money.format(SCATTER[5]!.pay * bet)} + {SCATTER[5]!.spins} FS</span>
              </li>
            </ul>
            <p className="fine">Werte in Spielgeld beim aktuellen Einsatz. Kein Echtgeld.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
