import type { Sym } from "@/game/logic";

export type Idol = {
  sym: Sym;
  name: string;
  role: string;
  line: string;
  img: string;
};

export const IDOLS: Idol[] = [
  {
    sym: "mika",
    name: "Mika",
    role: "Nachtschicht",
    line: "Näher. Die Lichter stehen dir.",
    img: "/art/mika.jpg",
  },
  {
    sym: "hana",
    name: "Hana",
    role: "Rote Bühne",
    line: "Noch eine Runde. Nur wir zwei.",
    img: "/art/hana.jpg",
  },
  {
    sym: "aoi",
    name: "Aoi",
    role: "Neon-Kante",
    line: "Nicht blinzeln. Ich schon gar nicht.",
    img: "/art/aoi.jpg",
  },
  {
    sym: "rin",
    name: "Rin",
    role: "Pop-Licht",
    line: "Hey — der Blick bleibt an mir hängen?",
    img: "/art/rin.jpg",
  },
  {
    sym: "wild",
    name: "Luna",
    role: "Wild",
    line: "Wünsch dir was. Ich hör zu.",
    img: "/art/luna.jpg",
  },
];

export const SYMBOL_ART: Partial<Record<Sym, string>> = {
  sakura: "/art/sakura.jpg",
  fan: "/art/fan.jpg",
  lantern: "/art/lantern.jpg",
  rin: "/art/rin.jpg",
  aoi: "/art/aoi.jpg",
  hana: "/art/hana.jpg",
  mika: "/art/mika.jpg",
  wild: "/art/luna.jpg",
  scatter: "/art/scatter.jpg",
};

export const RANK_LABEL: Partial<Record<Sym, string>> = {
  ten: "10",
  jack: "J",
  queen: "Q",
  king: "K",
  ace: "A",
};

export const SYMBOL_NAME: Record<Sym, string> = {
  ten: "10",
  jack: "J",
  queen: "Q",
  king: "K",
  ace: "A",
  sakura: "Sakura",
  fan: "Fächer",
  lantern: "Laterne",
  rin: "Rin",
  aoi: "Aoi",
  hana: "Hana",
  mika: "Mika",
  wild: "Luna · Wild",
  scatter: "Zugabe",
};

export function idolFor(sym: Sym | null): Idol {
  return IDOLS.find((idol) => idol.sym === sym) ?? IDOLS[0]!;
}

export const money = new Intl.NumberFormat("de-DE");
