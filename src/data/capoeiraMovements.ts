import type { CapoeiraMovement } from "../types/appData";

const BAG_MOVEMENTS = new Set([
  "Benção",
  "Martelo",
  "Pisão / Chapa",
  "Meia-Lua de Frente",
  "Queixada",
  "Gancho / Esporão",
  "Pisão de costas",
]);

const GROUND_MOVEMENTS = new Set([
  "Ginga",
  "1ª esquiva",
  "Troca Frontal",
  "Passagem Lateral",
  "Descida Básica",
  "Esquiva de base",
  "Rolê",
  "Troca lateral",
  "Esquiva lateral",
  "Negativa",
  "Meio rolê",
  "Aú simples",
  "Cocorinha",
  "Rolê com negativa",
  "Subida paralela",
  "Ponte Lateral",
]);

const MOVEMENT_NAMES = [
  "Ginga",
  "Benção",
  "1ª esquiva",
  "Martelo",
  "Pisão / Chapa",
  "Troca Frontal",
  "Passagem Lateral",
  "Meia-Lua de Frente",
  "Descida Básica",
  "Queixada",
  "Esquiva de base",
  "Gancho / Esporão",
  "Rolê",
  "Troca lateral",
  "Armada",
  "Esquiva lateral",
  "Negativa",
  "Meia-lua de compasso",
  "Meio rolê",
  "Aú simples",
  "Exercício de Reflexo",
  "Esquivar de martelo",
  "Contragolpe de Queixada",
  "Contragolpe de Armada",
  "Contragolpes de meia-lua",
  "Combinações de movimentos básicos",
  "16 formas de sair do pé do berimbau",
  "12 combinações com aú simples",
  "Como ganhar velocidade na capoeira",
  "Regras e fundamentos da roda",
  "Finta de Queixada",
  "Saída Lateral",
  "Martelo Passando",
  "Meia-Lua Presa",
  "Balanço Frontal",
  "Cocorinha",
  "Martelo preso",
  "Rasteira de frente",
  "Rolê com negativa",
  "Subida paralela",
  "Martelo bicicleta",
  "Finta de armada",
  "Finta de Meia-Lua",
  "Pisão de costas",
  "Negativa de costas",
  "Ponte Lateral",
  "Variações da passagem de costas",
  "Finta Paralela",
  "Martelo rodado",
  "Rabo de Arraia",
];

export const CAPOEIRA_MOVEMENTS: CapoeiraMovement[] = MOVEMENT_NAMES.map(
  (displayName, index) => ({
    lessonNumber: index + 1,
    displayName,
    category: getCategory(displayName, index + 1),
    status: "not_started",
    reviewsCompleted: 0,
    canUseBag: BAG_MOVEMENTS.has(displayName),
    referenceSearchQuery: `${displayName} capoeira Mestre Koioty`,
    notes: GROUND_MOVEMENTS.has(displayName)
      ? "Melhor treinar no chão/espaço livre."
      : BAG_MOVEMENTS.has(displayName)
        ? "Pode ir para o saco com cuidado técnico."
        : undefined,
  }),
);

function getCategory(displayName: string, lessonNumber: number): string {
  if (displayName.includes("Contragolpe") || displayName.includes("Reflexo")) {
    return "reflexo_contragolpe";
  }
  if (
    displayName.includes("esquiva") ||
    displayName.includes("Negativa") ||
    displayName.includes("Cocorinha")
  ) {
    return "defesa_esquiva";
  }
  if (
    displayName.includes("Martelo") ||
    displayName.includes("Pisão") ||
    displayName.includes("Queixada") ||
    displayName.includes("Armada") ||
    displayName.includes("Meia")
  ) {
    return "chute";
  }
  if (
    displayName.includes("Rolê") ||
    displayName.includes("Aú") ||
    displayName.includes("Passagem") ||
    displayName.includes("Troca")
  ) {
    return "transicao_chao";
  }
  if (lessonNumber >= 26) {
    return "combinacao_variacao";
  }
  return "base";
}
