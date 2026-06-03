import { Search } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import type { CapoeiraMovement, CapoeiraMovementStatus } from "../../types/appData";

type CapoeiraPageProps = {
  movements: CapoeiraMovement[];
  trainingReviewCount?: number;
  onUpdate: (movements: CapoeiraMovement[]) => void;
};

const statusOptions: Array<{ value: CapoeiraMovementStatus; label: string }> = [
  { value: "not_started", label: "Não iniciado" },
  { value: "learning", label: "Aprendendo" },
  { value: "validating", label: "Em validação" },
  { value: "mastered", label: "Dominado" },
  { value: "review", label: "Revisão" },
];

export function CapoeiraPage({
  movements,
  trainingReviewCount = 0,
  onUpdate,
}: CapoeiraPageProps) {
  const nextMovement =
    movements.find((item) => item.status === "learning") ??
    movements.find((item) => item.status === "not_started") ??
    movements[0];
  const reviewQueue = movements
    .filter((item) => item.status === "mastered" || item.status === "review")
    .sort((a, b) => a.reviewsCompleted - b.reviewsCompleted)
    .slice(0, 6);
  const mastered = movements.filter((item) => item.status === "mastered").length;
  const validating = movements.filter((item) => item.status === "validating").length;

  function updateMovement(index: number, patch: Partial<CapoeiraMovement>) {
    onUpdate(
      movements.map((movement, candidateIndex) =>
        candidateIndex === index ? { ...movement, ...patch } : movement,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
          Capoeira
        </p>
        <h2 className="text-2xl font-black text-white">Biblioteca e revisão</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Movimentos" value={`${movements.length}`} />
        <Metric label="Dominados" value={`${mastered}`} />
        <Metric label="Revisoes em treinos" value={`${trainingReviewCount}`} />
        <Metric label="Validação" value={`${validating}`} />
      </div>

      {nextMovement ? (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
            Próximo movimento
          </p>
          <h3 className="mt-1 text-xl font-black text-white">
            {nextMovement.displayName}
          </h3>
          <p className="mt-2 text-sm text-slate-300">{nextMovement.notes}</p>
        </Card>
      ) : null}

      <Card>
        <h3 className="text-lg font-black text-white">Banco de revisão</h3>
        <div className="mt-3 grid gap-2">
          {reviewQueue.length ? (
            reviewQueue.map((item) => (
              <div
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-bold text-slate-200"
                key={`${item.lessonNumber}-${item.displayName}`}
              >
                {item.displayName} · {item.reviewsCompleted} revisões
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">
              Domine alguns movimentos para liberar revisão espaçada.
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-3">
        {movements.map((movement, index) => (
          <Card key={`${movement.lessonNumber}-${movement.displayName}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Aula {movement.lessonNumber} · {movement.category}
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  {movement.displayName}
                </h3>
              </div>
              <button
                aria-label={`Pesquisar vídeo de ${movement.displayName}`}
                className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:border-teal-300 hover:text-teal-200"
                onClick={() => openReferenceSearch(movement.referenceSearchQuery)}
                title="Pesquisar referência"
                type="button"
              >
                <Search size={16} />
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Status
                <select
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  onChange={(event) =>
                    updateMovement(index, {
                      status: event.target.value as CapoeiraMovementStatus,
                      masteredAt:
                        event.target.value === "mastered"
                          ? (movement.masteredAt ?? new Date().toISOString())
                          : movement.masteredAt,
                    })
                  }
                  value={movement.status}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Qualidade"
                  onChange={(quality1to5) => updateMovement(index, { quality1to5 })}
                  value={movement.quality1to5 ?? 3}
                />
                <NumberField
                  label="Fluidez"
                  onChange={(fluency1to5) => updateMovement(index, { fluency1to5 })}
                  value={movement.fluency1to5 ?? 3}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Toggle
                active={Boolean(movement.rightSideDone)}
                label="Lado direito"
                onClick={() =>
                  updateMovement(index, { rightSideDone: !movement.rightSideDone })
                }
              />
              <Toggle
                active={Boolean(movement.leftSideDone)}
                label="Lado esquerdo"
                onClick={() =>
                  updateMovement(index, { leftSideDone: !movement.leftSideDone })
                }
              />
            </div>

            <Button
              className="mt-3 w-full"
              onClick={() =>
                updateMovement(index, {
                  reviewsCompleted: movement.reviewsCompleted + 1,
                  status: movement.status === "mastered" ? "review" : movement.status,
                })
              }
              variant="secondary"
            >
              Registrar revisão
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <input
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        max={5}
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`tap-target rounded-md border px-3 py-2 text-sm font-bold ${
        active
          ? "border-teal-400/30 bg-teal-400/10 text-teal-100"
          : "border-slate-800 bg-slate-950 text-slate-300"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function openReferenceSearch(query: string) {
  window.open(
    `https://www.google.com/search?tbm=vid&q=${encodeURIComponent(query)}`,
    "_blank",
    "noopener,noreferrer",
  );
}
