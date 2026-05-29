import type { Exercise, Workout } from "../types/training";

export function buildReferenceSearchQuery(item: Exercise, workout?: Workout): string {
  if (item.referenceSearchQuery) {
    return item.referenceSearchQuery;
  }

  const name = item.displayName ?? item.name;
  if (workout?.modality === "boxing") {
    return `${name} boxing technique`;
  }
  if (workout?.modality === "basketball") {
    return `${name} basketball drill`;
  }
  if (workout?.modality === "capoeira") {
    return `${name} capoeira Mestre Koioty`;
  }
  if (workout?.modality === "dance") {
    return `${name} Steezy`;
  }

  return `${name} execucao correta exercicio`;
}

export function openReferenceVideoSearch(item: Exercise, workout?: Workout) {
  const query = encodeURIComponent(buildReferenceSearchQuery(item, workout));
  window.open(
    `https://www.google.com/search?tbm=vid&q=${query}`,
    "_blank",
    "noopener,noreferrer",
  );
}
