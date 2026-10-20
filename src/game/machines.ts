import type { Sym } from "@/game/logic";

export type MachineId = "aurora" | "kette" | "vollmond" | "duett";
export type MachineKind = "privat" | "climb" | "expand" | "mirror";

export type Machine = {
  id: MachineId;
  name: string;
  kicker: string;
  bonus: string;
  rules: string;
  host: Sym;
  kind: MachineKind;
};

export const MACHINES: readonly Machine[] = [
  {
    id: "aurora",
    name: "Aurora Idol",
    kicker: "Privatbühne",
    host: "mika",
    kind: "privat",
    bonus: "Drei Zugaben: Näher, Länger oder Luna in der Mitte.",
    rules: "Drei Zugaben öffnen die Privatbühne. Näher zahlt ×3, Länger gibt 6 Drehungen extra, Mitten auf der Bühne lässt Luna in der Mitte stehen.",
  },
  {
    id: "kette",
    name: "Kettenlicht",
    kicker: "Folgenglück",
    host: "rin",
    kind: "climb",
    bonus: "Jeder Gewinn hebt den Faktor. Ein Fehlschlag setzt auf ×2.",
    rules: "Drei Zugaben starten Kettenlicht. Der Faktor beginnt bei ×2, steigt mit jedem Gewinn bis ×8 und fällt bei einem Fehlschlag auf ×2.",
  },
  {
    id: "vollmond",
    name: "Vollmond",
    kicker: "Volles Wild",
    host: "wild",
    kind: "expand",
    bonus: "Im Bonus füllt jedes Wild die ganze Walze.",
    rules: "Drei Zugaben starten Vollmond. Jede Walze mit einem Wild wird darin komplett zu Luna. Gewinne ×2.",
  },
  {
    id: "duett",
    name: "Duett",
    kicker: "Spiegelsaal",
    host: "hana",
    kind: "mirror",
    bonus: "Im Bonus spiegelt sich die Bühne von außen.",
    rules: "Drei Zugaben starten das Duett. Walze 4 kopiert Walze 2, Walze 5 kopiert Walze 1. Gewinne ×2.",
  },
];

export function machineById(id: MachineId): Machine {
  return MACHINES.find((machine) => machine.id === id) ?? MACHINES[0]!;
}
