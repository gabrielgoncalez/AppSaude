import { CheckCircle2, ChevronLeft, ChevronRight, Search, Timer, Target } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import type {
  Exercise,
  SkillWorkoutMetrics,
  TechnicalBlockLog,
  Workout,
  WorkoutBlock,
} from "../../types/training";

type SkillWorkoutLoggerProps = {
  workout: Workout;
  onComplete: (metrics: SkillWorkoutMetrics) => void;
};

type MetricKey =
  | "durationMin"
  | "rounds"
  | "errors"
  | "hits"
  | "attempts"
  | "cleanStreakSec";

export function SkillWorkoutLogger({ workout, onComplete }: SkillWorkoutLoggerProps) {
  const [metrics, setMetrics] = useState<SkillWorkoutMetrics>(() => getInitialMetrics(workout.id));
  const [blockState, setBlockState] = useState({ index: 0, workoutId: workout.id });
  const [completedBlockIds, setCompletedBlockIds] = useState<string[]>([]);
  const [completedItemIds, setCompletedItemIds] = useState<string[]>([]);
  const labels = useMemo(() => getTechnicalLabels(workout.id), [workout.id]);
  const activeBlockIndex = blockState.workoutId === workout.id ? blockState.index : 0;

  function setNumber(key: MetricKey, value: number | undefined) {
    setMetrics((current) => ({ ...current, [key]: value }));
  }

  function setRating(key: string, value: 1 | 2 | 3 | 4 | 5) {
    setMetrics((current) => ({
      ...current,
      technicalRatings: {
        ...(current.technicalRatings ?? {}),
        [key]: value,
      },
    }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
          Modo técnico
        </p>
        <h2 className="mt-1 text-2xl font-black text-white">{workout.name}</h2>
        <TechnicalWorkoutFocus
          activeBlockIndex={activeBlockIndex}
          completedBlockIds={completedBlockIds}
          completedItemIds={completedItemIds}
          onChangeBlock={(index) => setBlockState({ index, workoutId: workout.id })}
          onCompleteBlock={(block) => {
            setCompletedBlockIds((current) => unique([...current, block.id]));
            setCompletedItemIds((current) =>
              unique([...current, ...block.items.map((item) => item.id)]),
            );
          }}
          onToggleItem={(itemId) =>
            setCompletedItemIds((current) =>
              current.includes(itemId)
                ? current.filter((item) => item !== itemId)
                : [...current, itemId],
            )
          }
          workout={workout}
        />
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-teal-200">
          <Target size={18} />
          <h3 className="font-black text-white">Registro rápido</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {labels.numberFields.map((field) => (
            <NumberField
              key={field.key}
              label={field.label}
              onChange={(value) => setNumber(field.key, value)}
              suffix={field.suffix}
              value={metrics[field.key]}
            />
          ))}
        </div>

        {labels.ratingFields.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {labels.ratingFields.map((field) => (
              <RatingField
                key={field.key}
                label={field.label}
                onChange={(value) => setRating(field.key, value)}
                value={metrics.technicalRatings?.[field.key] ?? 3}
              />
            ))}
          </div>
        ) : null}

        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-400">
          Nota rápida
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            onChange={(event) =>
              setMetrics((current) => ({ ...current, notes: event.target.value }))
            }
            placeholder="Algo útil para lembrar na próxima sessão"
            value={metrics.notes ?? ""}
          />
        </label>

        <Button
          className="mt-5 w-full py-4"
          icon={<CheckCircle2 size={18} />}
          onClick={() =>
            onComplete({
              ...metrics,
              completedBlocks: unique([
                ...completedBlockIds,
                ...(workout.workoutBlocks ?? []).map((block) => block.id),
              ]),
              completedItems: unique([
                ...completedItemIds,
                ...(workout.workoutBlocks ?? []).flatMap((block) =>
                  block.items
                    .filter((item) => item.active !== false && item.phaseAvailability !== "future")
                    .map((item) => item.id),
                ),
              ]),
              technicalBlocks: buildTechnicalBlocks(workout, metrics, {
                completedBlockIds,
                completedItemIds,
                completeAll: true,
              }),
            })
          }
        >
          Concluir missão
        </Button>
      </Card>
    </div>
  );
}

function TechnicalWorkoutFocus({
  workout,
  activeBlockIndex,
  completedBlockIds,
  completedItemIds,
  onChangeBlock,
  onCompleteBlock,
  onToggleItem,
}: {
  workout: Workout;
  activeBlockIndex: number;
  completedBlockIds: string[];
  completedItemIds: string[];
  onChangeBlock: (index: number) => void;
  onCompleteBlock: (block: WorkoutBlock) => void;
  onToggleItem: (itemId: string) => void;
}) {
  if (workout.workoutBlocks?.length) {
    const blocks = workout.workoutBlocks;
    const safeIndex = Math.min(activeBlockIndex, blocks.length - 1);
    const currentBlock = blocks[safeIndex];
    const nextBlock = blocks[safeIndex + 1];
    const completedBlocks = blocks.slice(0, safeIndex);

    return (
      <div className="mt-4 space-y-3">
        {completedBlocks.length ? (
          <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Blocos anteriores
            </p>
            <p className="mt-1 text-sm font-bold text-slate-300">
              {completedBlocks.map((block) => block.name).join(" -> ")}
            </p>
          </div>
        ) : null}

        <div className="rounded-lg border border-teal-300/30 bg-teal-400/10 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-200">
                Bloco {safeIndex + 1} de {blocks.length} · {getBlockLabel(currentBlock)}
              </p>
              <h3 className="mt-1 text-xl font-black text-white">{currentBlock.name}</h3>
            </div>
            <div className="flex gap-2">
              <IconButton
                disabled={safeIndex === 0}
                label="Bloco anterior"
                onClick={() => onChangeBlock(Math.max(0, safeIndex - 1))}
              >
                <ChevronLeft size={16} />
              </IconButton>
              <IconButton
                disabled={safeIndex >= blocks.length - 1}
                label="Próximo bloco"
                onClick={() => onChangeBlock(Math.min(blocks.length - 1, safeIndex + 1))}
              >
                <ChevronRight size={16} />
              </IconButton>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {currentBlock.items.map((item) => (
              <TechnicalItemRow
                completed={completedItemIds.includes(item.id)}
                item={item}
                key={item.id}
                onToggle={() => onToggleItem(item.id)}
              />
            ))}
          </div>

          <Button
            className="mt-4 w-full"
            disabled={safeIndex >= blocks.length - 1}
            icon={<CheckCircle2 size={18} />}
            onClick={() => {
              onCompleteBlock(currentBlock);
              onChangeBlock(Math.min(blocks.length - 1, safeIndex + 1));
            }}
            variant={safeIndex >= blocks.length - 1 ? "secondary" : "primary"}
          >
            {completedBlockIds.includes(currentBlock.id)
              ? "Bloco finalizado"
              : "Finalizar bloco"}
          </Button>
        </div>

        {nextBlock ? (
          <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Próximo bloco
            </p>
            <p className="mt-1 font-black text-white">{nextBlock.name}</p>
          </div>
        ) : null}
      </div>
    );
  }

  const blocks = workout.blocks ?? [];
  const safeIndex = Math.min(activeBlockIndex, Math.max(blocks.length - 1, 0));
  const currentBlock = blocks[safeIndex];
  const nextBlock = blocks[safeIndex + 1];

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg border border-orange-300/30 bg-orange-400/10 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-200">
          Plano simplificado
        </p>
        <h3 className="mt-1 text-xl font-black text-white">
          {currentBlock ?? "Sem blocos estruturados"}
        </h3>
        <div className="mt-3 flex gap-2">
          <IconButton
            disabled={safeIndex === 0}
            label="Bloco anterior"
            onClick={() => onChangeBlock(Math.max(0, safeIndex - 1))}
          >
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton
            disabled={safeIndex >= blocks.length - 1}
            label="Próximo bloco"
            onClick={() => onChangeBlock(Math.min(blocks.length - 1, safeIndex + 1))}
          >
            <ChevronRight size={16} />
          </IconButton>
        </div>
      </div>
      {nextBlock ? (
        <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Próximo bloco
          </p>
          <p className="mt-1 font-black text-white">{nextBlock}</p>
        </div>
      ) : null}
    </div>
  );
}

function TechnicalItemRow({
  item,
  completed,
  onToggle,
}: {
  item: Exercise;
  completed: boolean;
  onToggle: () => void;
}) {
  const name = item.displayName ?? item.name;
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-3 ${
        completed ? "border-teal-400/30 bg-teal-400/10" : "border-slate-800 bg-slate-950"
      }`}
    >
      <div className="min-w-0">
        <p className="font-black text-white">{name}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          {formatItemTarget(item)}
        </p>
        {item.note ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.note}</p>
        ) : null}
      </div>
      <button
        aria-label={`Pesquisar vídeo de referência para ${name}`}
        className="tap-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:border-teal-300 hover:text-teal-200"
        onClick={() => openReferenceSearch(item.referenceSearchQuery ?? name)}
        title="Pesquisar referência"
        type="button"
      >
        <Search size={16} />
      </button>
      <button
        aria-label={completed ? `Desmarcar ${name}` : `Marcar ${name} como feito`}
        className="tap-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:border-teal-300 hover:text-teal-200"
        onClick={onToggle}
        title={completed ? "Desmarcar" : "Marcar feito"}
        type="button"
      >
        <CheckCircle2 size={16} />
      </button>
    </div>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:border-teal-300 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function getBlockLabel(block: WorkoutBlock): string {
  const labels: Record<WorkoutBlock["type"], string> = {
    warmup: "aquecimento",
    mobility: "mobilidade",
    base_body: "base corporal",
    main: "principal",
    strength: "força",
    hypertrophy: "hipertrofia",
    technical: "técnica",
    skill: "habilidade",
    rounds: "rounds",
    core: "base corporal",
    cooldown: "finalização",
    test: "teste",
    review: "revisão",
  };
  return labels[block.type];
}

function formatItemTarget(item: Exercise): string {
  const parts: string[] = [];
  if (item.targetSets > 1) {
    parts.push(`${item.targetSets} séries`);
  }
  if (item.repMin !== undefined && item.repMax !== undefined) {
    parts.push(
      item.repMin === item.repMax
        ? `${item.repMin} reps`
        : `${item.repMin}-${item.repMax} reps`,
    );
  }
  if (item.durationSec) {
    parts.push(formatDuration(item.durationSec));
  }
  if (item.holdSec) {
    parts.push(`${item.holdSec}s pausa`);
  }
  if (item.restSec) {
    parts.push(`${item.restSec}s descanso`);
  }
  if (item.equipment) {
    parts.push(item.equipment);
  }
  return parts.length ? parts.join(" · ") : "Execução técnica";
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function openReferenceSearch(query: string) {
  window.open(
    `https://www.google.com/search?tbm=vid&q=${encodeURIComponent(query)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function getInitialMetrics(workoutId: string): SkillWorkoutMetrics {
  if (workoutId === "boxe") {
    return {
      rounds: 5,
      hits: 0,
      attempts: 50,
      technicalRatings: { boxing_guard: 3, boxing_base: 3, boxing_breathing: 3 },
    };
  }

  if (workoutId === "basquete-handles") {
    return {
      durationMin: 20,
      errors: 0,
      cleanStreakSec: 30,
      technicalRatings: {
        basketball_eyes_up: 3,
        basketball_weak_hand: 3,
        basketball_body_control: 3,
      },
    };
  }

  if (workoutId === "danca") {
    return {
      durationMin: 30,
      rounds: 1,
      quality1to5: 3,
      technicalRatings: { dance_confidence: 3, dance_fluency: 3, dance_memory: 3 },
    };
  }

  if (workoutId === "capoeira") {
    return {
      durationMin: 30,
      quality1to5: 3,
      technicalRatings: { capoeira_quality: 3, capoeira_control: 3, capoeira_fluency: 3 },
    };
  }

  return { durationMin: 20, quality1to5: 3 };
}

function getTechnicalLabels(workoutId: string) {
  if (workoutId === "boxe") {
    return {
      numberFields: [
        { key: "rounds" as const, label: "Rounds", suffix: "" },
        { key: "hits" as const, label: "Acertos", suffix: "" },
        { key: "attempts" as const, label: "Tentativas", suffix: "" },
      ],
      ratingFields: [
        { key: "boxing_guard", label: "Guarda" },
        { key: "boxing_base", label: "Base" },
        { key: "boxing_breathing", label: "Respiração" },
      ],
    };
  }

  if (workoutId === "basquete-handles") {
    return {
      numberFields: [
        { key: "durationMin" as const, label: "Tempo", suffix: "min" },
        { key: "errors" as const, label: "Perdas", suffix: "" },
        { key: "cleanStreakSec" as const, label: "Sequência limpa", suffix: "s" },
      ],
      ratingFields: [
        { key: "basketball_eyes_up", label: "Olhos para cima" },
        { key: "basketball_weak_hand", label: "Mão fraca" },
        { key: "basketball_body_control", label: "Controle corporal" },
      ],
    };
  }

  if (workoutId === "danca") {
    return {
      numberFields: [
        { key: "durationMin" as const, label: "Duração", suffix: "min" },
        { key: "rounds" as const, label: "Coreografia", suffix: "x" },
      ],
      ratingFields: [
        { key: "dance_confidence", label: "Confiança" },
        { key: "dance_fluency", label: "Fluidez" },
        { key: "dance_memory", label: "Memória" },
      ],
    };
  }

  if (workoutId === "capoeira") {
    return {
      numberFields: [{ key: "durationMin" as const, label: "Duração", suffix: "min" }],
      ratingFields: [
        { key: "capoeira_quality", label: "Qualidade" },
        { key: "capoeira_control", label: "Controle" },
        { key: "capoeira_fluency", label: "Fluidez" },
      ],
    };
  }

  return {
    numberFields: [{ key: "durationMin" as const, label: "Duração", suffix: "min" }],
    ratingFields: [{ key: "quality", label: "Qualidade" }],
  };
}

function buildTechnicalBlocks(
  workout: Workout,
  metrics: SkillWorkoutMetrics,
  state: {
    completedBlockIds: string[];
    completedItemIds: string[];
    completeAll: boolean;
  },
): TechnicalBlockLog[] {
  const completedAt = new Date().toISOString();
  return (workout.workoutBlocks ?? []).map((block) => {
    const blockCompleted = state.completeAll || state.completedBlockIds.includes(block.id);
    const isTestBlock = block.blockMode === "test" || block.type === "test";
    const items = block.items
      .filter((item) => item.active !== false && item.phaseAvailability !== "future")
      .map((item) => {
        const completed =
          blockCompleted || state.completeAll || state.completedItemIds.includes(item.id);
        return {
          itemId: item.id,
          itemName: item.displayName ?? item.name,
          completed,
          completedAt: completed ? completedAt : undefined,
          metricValues: isTestBlock
            ? {
                durationMin: metrics.durationMin,
                rounds: metrics.rounds,
                errors: metrics.errors,
                hits: metrics.hits,
                attempts: metrics.attempts,
                cleanStreakSec: metrics.cleanStreakSec,
                quality1to5: metrics.quality1to5,
              }
            : undefined,
          technicalRatings: isTestBlock ? metrics.technicalRatings : undefined,
          notes: isTestBlock ? metrics.notes : undefined,
        };
      });

    return {
      blockId: block.id,
      blockName: block.name,
      completed: blockCompleted,
      completedAt: blockCompleted ? completedAt : undefined,
      items,
    };
  });
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

type NumberFieldProps = {
  label: string;
  value?: number;
  suffix: string;
  onChange: (value: number | undefined) => void;
};

function NumberField({ label, value, suffix, onChange }: NumberFieldProps) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <div className="mt-1 flex overflow-hidden rounded-md border border-slate-700 bg-slate-950">
        <input
          className="w-full bg-transparent px-3 py-3 text-lg font-black text-white"
          inputMode="decimal"
          onChange={(event) =>
            onChange(event.target.value === "" ? undefined : Number(event.target.value))
          }
          type="number"
          value={value ?? ""}
        />
        {suffix ? (
          <span className="inline-flex items-center gap-1 px-3 py-2 text-slate-500">
            <Timer size={14} />
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

type RatingFieldProps = {
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
};

function RatingField({ label, value, onChange }: RatingFieldProps) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-lg font-black text-white"
        onChange={(event) => onChange(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
        value={value}
      >
        {[1, 2, 3, 4, 5].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
