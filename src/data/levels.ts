export type Level = {
  level: number;
  name: string;
  minXp: number;
};

export const LEVELS: Level[] = [
  { level: 1, name: "Recomeço", minXp: 0 },
  { level: 2, name: "Consistência", minXp: 300 },
  { level: 3, name: "Base Forte", minXp: 750 },
  { level: 4, name: "Motor Ligado", minXp: 1500 },
  { level: 5, name: "Gigante Ágil", minXp: 3000 },
  { level: 6, name: "Blindado", minXp: 5000 },
  { level: 7, name: "Atleta em Construção", minXp: 8000 },
  { level: 8, name: "Monstro Técnico", minXp: 12000 },
];
