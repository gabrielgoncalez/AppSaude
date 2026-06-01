import type { Reward } from "../types/rewards";

const now = "2026-05-27T00:00:00.000Z";

export const DEFAULT_REWARDS: Reward[] = [
  {
    id: "camiseta-nova",
    title: "Comprar camiseta nova",
    description: "Uma camiseta que marque a fase nova.",
    costXp: 300,
    category: "roupa",
    claimed: false,
    createdAt: now,
  },
  {
    id: "luva-bandagem",
    title: "Luva ou bandagem melhor",
    description: "Equipamento para treinar boxe com mais conforto.",
    costXp: 450,
    category: "equipamento",
    claimed: false,
    createdAt: now,
  },
  {
    id: "tenis-melhor",
    title: "Tênis melhor",
    description: "Para academia, caminhada e quadra.",
    costXp: 800,
    category: "equipamento",
    claimed: false,
    createdAt: now,
  },
  {
    id: "refeicao-planejada",
    title: "Sair para comer algo planejado",
    description: "Recompensa sem transformar em sabotagem.",
    costXp: 120,
    category: "lazer",
    claimed: false,
    createdAt: now,
  },
  {
    id: "descanso-premium",
    title: "Dia de descanso premium",
    description: "Recuperação levada a sério.",
    costXp: 180,
    category: "especial",
    claimed: false,
    createdAt: now,
  },
];
