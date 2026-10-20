import { useEffect, useRef } from "react";

type Bit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vr: number;
  life: number;
  max: number;
  kind: "petal" | "spark";
};

export function ParticleField({ burst }: { burst: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef(burst);
  burstRef.current = burst;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bits: Bit[] = [];
    let frame = 0;
    let lastBurst = burstRef.current;
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (kind: Bit["kind"], x: number, y: number, burstSpeed = false) => {
      bits.push({
        x,
        y,
        vx: (Math.random() - 0.5) * (burstSpeed ? 180 : 28),
        vy: burstSpeed ? 40 + Math.random() * 160 : 18 + Math.random() * 36,
        r: kind === "petal" ? 5 + Math.random() * 6 : 1.2 + Math.random() * 1.8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 2.4,
        life: 0,
        max: burstSpeed ? 0.8 + Math.random() * 0.7 : 6 + Math.random() * 6,
        kind,
      });
    };

    const loop = (now: number) => {
      frame = now;
      if (burstRef.current !== lastBurst) {
        lastBurst = burstRef.current;
        for (let i = 0; i < 36; i++) spawn(i % 3 === 0 ? "spark" : "petal", w * 0.5, h * 0.42, true);
      }
      if (!reduced && bits.length < 48 && Math.random() < 0.4) {
        spawn(Math.random() < 0.7 ? "petal" : "spark", Math.random() * w, -12);
      }
      ctx.clearRect(0, 0, w, h);
      for (let i = bits.length - 1; i >= 0; i--) {
        const p = bits[i]!;
        p.life += 0.016;
        if (p.life > p.max) {
          bits.splice(i, 1);
          continue;
        }
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.vx *= 0.99;
        p.rot += p.vr * 0.016;
        const fade = 1 - p.life / p.max;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, fade) * (p.kind === "spark" ? 0.85 : 0.7);
        if (p.kind === "petal") {
          ctx.fillStyle = "#ff4f92";
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#f0c14a";
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      void frame;
    };
  }, []);

  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
