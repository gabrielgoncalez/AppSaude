import { CheckCircle2, Timer, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import type { SkillWorkoutMetrics, Workout } from "../../types/training";

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
  const labels = useMemo(() => getTechnicalLabels(workout.id), [workout.id]);

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
        <div className="mt-4 grid gap-2">
          {workout.blocks?.map((block) => (
            <div className="rounded-md bg-slate-950 px-3 py-2 text-sm text-slate-200" key={block}>
              {block}
            </div>
          ))}
        </div>
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
          onClick={() => onComplete(metrics)}
        >
          Concluir missão
        </Button>
      </Card>
    </div>
  );
}

function getInitialMetrics(workoutId: string): SkillWorkoutMetrics {
  if (workoutId === "boxe") {
    return {
      rounds: 5,
      hits: 0,
      attempts: 50,
      technicalRatings: { guarda: 3, base: 3, respiracao: 3 },
    };
  }

  if (workoutId === "basquete-handles") {
    return {
      durationMin: 20,
      errors: 0,
      cleanStreakSec: 30,
      technicalRatings: { olhos: 3, mao_fraca: 3 },
    };
  }

  if (workoutId === "danca") {
    return {
      durationMin: 30,
      rounds: 1,
      quality1to5: 3,
      technicalRatings: { fluidez: 3 },
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
        { key: "guarda", label: "Guarda" },
        { key: "base", label: "Base" },
        { key: "respiracao", label: "Respiração" },
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
        { key: "olhos", label: "Olhos para cima" },
        { key: "mao_fraca", label: "Mão fraca" },
      ],
    };
  }

  if (workoutId === "danca") {
    return {
      numberFields: [
        { key: "durationMin" as const, label: "Duração", suffix: "min" },
        { key: "rounds" as const, label: "Coreografia", suffix: "x" },
      ],
      ratingFields: [{ key: "fluidez", label: "Fluidez" }],
    };
  }

  return {
    numberFields: [{ key: "durationMin" as const, label: "Duração", suffix: "min" }],
    ratingFields: [{ key: "qualidade", label: "Qualidade" }],
  };
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
