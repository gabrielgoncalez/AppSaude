export type Level = {
  level: number;
  name: string;
  minXp: number;
};

export const LEVELS: Level[] = [
  { level: 1, name: "Recomeço", minXp: 0 },
  { level: 2, name: "Consistência", minXp: 400 },
  { level: 3, name: "Base Forte", minXp: 1200 },
  { level: 4, name: "Motor Ligado", minXp: 2400 },
  { level: 5, name: "Gigante Ágil", minXp: 4200 },
  { level: 6, name: "Blindado", minXp: 6600 },
  { level: 7, name: "Atleta em Construção", minXp: 9600 },
  { level: 8, name: "Monstro Técnico", minXp: 13200 },
  { level: 9, name: "Corpo em Obra", minXp: 17400 },
  { level: 10, name: "Gigante Real", minXp: 22200 },
];
