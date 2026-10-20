import { useEffect, useRef, useState } from "react";
import { SYMBOL_ART, RANK_LABEL, SYMBOL_NAME } from "@/game/content";
import { slotEase, windowAt, type Sym } from "@/game/logic";

export type ReelRun = {
  id: number;
  from: number;
  travel: number;
  duration: number;
};

export function SymbolFace({ sym }: { sym: Sym }) {
  const art = SYMBOL_ART[sym];
  const rank = RANK_LABEL[sym];
  return (
    <div className={`face face-${sym}`}>
      {art ? <img src={art} alt="" draggable={false} /> : <span className="rank">{rank}</span>}
      {sym === "wild" ? <em className="ribbon">WILD</em> : null}
      {sym === "scatter" ? <em className="ribbon ribbon-hot">BONUS</em> : null}
      <span className="sr">{SYMBOL_NAME[sym]}</span>
    </div>
  );
}

export function Reel({
  strip,
  stop,
  run,
  cell,
  wins,
  dim,
  anticipate,
  reduced,
  onDone,
}: {
  strip: Sym[];
  stop: number;
  run: ReelRun | null;
  cell: number;
  wins: boolean[];
  dim: boolean;
  anticipate: boolean;
  reduced: boolean;
  onDone: (id: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const cellRef = useRef(cell);
  cellRef.current = cell;
  const [view, setView] = useState<Sym[]>(() => windowAt(strip, stop, 4));
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!run) return;
    let raf = 0;
    let stopped = false;
    const start = performance.now();
    let lastIndex = -1;
    setSpinning(true);
    setLanded(false);

    const tick = (now: number) => {
      if (stopped) return;
      const t = Math.min(1, (now - start) / run.duration);
      const p = slotEase(t) * run.travel;
      const index = Math.min(run.travel, Math.floor(p));
      const frac = p - index;
      if (index !== lastIndex) {
        lastIndex = index;
        const top = (run.from + index) % strip.length;
        setView(windowAt(strip, top, 4));
      }
      const el = stripRef.current;
      const h = cellRef.current;
      if (el) {
        el.style.transform = `translate3d(0, ${-frac * h}px, 0)`;
        const blur = reduced || t > 0.82 ? 0 : (1 - t / 0.82) * 7;
        el.style.filter = blur > 0.35 ? `blur(${blur.toFixed(2)}px)` : "none";
      }
      if (t >= 1) {
        setSpinning(false);
        setView(windowAt(strip, (run.from + run.travel) % strip.length, 4));
        if (el) {
          el.style.transform = "translate3d(0,0,0)";
          el.style.filter = "none";
        }
        setLanded(true);
        window.setTimeout(() => setLanded(false), 220);
        onDoneRef.current(run.id);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [run, strip, reduced]);

  useEffect(() => {
    if (run) return;
    setView(windowAt(strip, stop, 4));
  }, [run, stop, strip]);

  const shown = view.slice(0, spinning ? 4 : 3);

  return (
    <div className={`reel ${anticipate && spinning ? "anticipate" : ""} ${landed ? "landed" : ""}`}>
      <div
        ref={stripRef}
        className="strip"
        style={{ height: cell * (spinning ? 4 : 3) }}
      >
        {shown.slice(0, spinning ? 4 : 3).map((sym, row) => {
          const win = !spinning && !!wins[row];
          return (
            <div
              key={`${sym}-${row}`}
              className={`cell ${win ? "win" : ""} ${dim && !win && !spinning ? "dim" : ""}`}
              style={{ height: cell || undefined }}
            >
              <SymbolFace sym={sym} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
