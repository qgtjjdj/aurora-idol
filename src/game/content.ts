import type { Sym } from "@/game/logic";

export type Idol = {
  sym: Sym;
  name: string;
  role: string;
  line: string;
  img: string;
  encore: string;
  tease: readonly string[];
};

export const IDOLS: Idol[] = [
  {
    sym: "mika",
    name: "Mika",
    role: "Nachtschicht",
    line: "Näher. Die Lichter stehen dir.",
    img: "/art/mika.jpg",
    encore: "/art/encore-mika.jpg",
    tease: ["Die anderen Lichter sind aus.", "Schau nur mich an.", "Noch eine Drehung. Für mich."],
  },
  {
    sym: "hana",
    name: "Hana",
    role: "Rote Bühne",
    line: "Noch eine Runde. Nur wir zwei.",
    img: "/art/hana.jpg",
    encore: "/art/encore-hana.jpg",
    tease: ["Rotes Kleid, rote Bühne.", "Komm näher an die Kante.", "Ich halte den Vorhang offen."],
  },
  {
    sym: "aoi",
    name: "Aoi",
    role: "Neon-Kante",
    line: "Nicht blinzeln. Ich schon gar nicht.",
    img: "/art/aoi.jpg",
    encore: "/art/encore-aoi.jpg",
    tease: ["Jacke auf. Blick fest.", "Du bleibst, bis ich fertig bin.", "Neon steht dir. Bleib im Licht."],
  },
  {
    sym: "rin",
    name: "Rin",
    role: "Pop-Licht",
    line: "Hey — der Blick bleibt an mir hängen?",
    img: "/art/rin.jpg",
    encore: "/art/encore-rin.jpg",
    tease: ["Zwinkern zählt nicht als Wegsehen.", "Lauter. Ich will dich hören.", "Noch ein Kostüm, noch eine Runde."],
  },
  {
    sym: "wild",
    name: "Luna",
    role: "Wild",
    line: "Wünsch dir was. Ich hör zu.",
    img: "/art/luna.jpg",
    encore: "/art/luna.jpg",
    tease: ["Die Mitte gehört mir.", "Wünsch dir was. Ich bleibe.", "Alle Augen hierher."],
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

export type GiftId = "near" | "long" | "wild";

export const GIFTS: readonly { id: GiftId; title: string; line: string; mult: number; extra: number }[] = [
  { id: "near", title: "Näher", line: "Sie tritt an die Kante. Gewinne ×3.", mult: 3, extra: 0 },
  { id: "long", title: "Länger", line: "Der Vorhang bleibt offen. +6 Drehungen.", mult: 2, extra: 6 },
  { id: "wild", title: "Mitten auf der Bühne", line: "Luna bleibt in der Mitte stehen.", mult: 2, extra: 0 },
];

export const money = new Intl.NumberFormat("de-DE");
