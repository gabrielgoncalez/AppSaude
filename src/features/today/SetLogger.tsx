import { CheckCircle2, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { getSetActionLabel, isFinalExerciseSet } from "../../lib/workoutFlow";
import type { SetLog } from "../../types/training";

type SetLoggerProps = {
  lastSet?: SetLog;
  previousSet?: SetLog;
  nextIndex: number;
  targetSets: number;
  initialReps?: number;
  initialDurationSec?: number;
  metricMode?: "reps" | "duration";
  weightLabel?: string;
  onSaveSet: (set: SetLog) => void;
  onFinishExerciseSet: (set: SetLog) => void;
};

export function SetLogger({
  lastSet,
  previousSet,
  nextIndex,
  targetSets,
  initialReps = 8,
  initialDurationSec = 30,
  metricMode = "reps",
  weightLabel = "Carga kg",
  onSaveSet,
  onFinishExerciseSet,
}: SetLoggerProps) {
  const base = useMemo(() => lastSet ?? previousSet, [lastSet, previousSet]);
  const [weightKg, setWeightKg] = useState<number>(base?.weightKg ?? 0);
  const [reps, setReps] = useState<number>(
    metricMode === "duration"
      ? (base?.durationSec ?? initialDurationSec)
      : (base?.reps ?? initialReps),
  );
  const isFinalSet = isFinalExerciseSet(nextIndex, targetSets);
  const actionLabel = getSetActionLabel(nextIndex, targetSets);

  function finishSet() {
    const set = {
      setIndex: nextIndex,
      weightKg,
      ...(metricMode === "duration" ? { durationSec: reps } : { reps }),
      completed: true,
    };

    if (isFinalSet) {
      onFinishExerciseSet(set);
      return;
    }

    onSaveSet(set);
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
            Série
          </p>
          <p className="text-2xl font-black text-white">
            {nextIndex} de {targetSets}
          </p>
        </div>
        <p className="rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300">
          ajuste e finalize
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <NumberStepper
          inputMode="decimal"
          label={weightLabel}
          maxDecimals={1}
          onChange={setWeightKg}
          step={2.5}
          value={weightKg}
        />
        <NumberStepper
          inputMode="numeric"
          label={metricMode === "duration" ? "Tempo (s)" : "Repeticoes"}
          onChange={setReps}
          step={metricMode === "duration" ? 5 : 1}
          value={reps}
        />
      </div>

      <Button className="mt-3 w-full" icon={<CheckCircle2 size={16} />} onClick={finishSet}>
        {actionLabel}
      </Button>
    </div>
  );
}

type NumberStepperProps = {
  inputMode: "decimal" | "numeric";
  label: string;
  maxDecimals?: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

function NumberStepper({
  inputMode,
  label,
  maxDecimals = 0,
  step,
  value,
  onChange,
}: NumberStepperProps) {
  const formatted = maxDecimals > 0 ? formatNumber(value, maxDecimals) : value;

  function update(next: number) {
    onChange(Math.max(0, roundToStep(next, step)));
  }

  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="mt-1 grid grid-cols-[48px_1fr_48px] overflow-hidden rounded-md border border-slate-700 bg-slate-950">
        <button
          aria-label={`Diminuir ${label}`}
          className="tap-target flex items-center justify-center border-r border-slate-800 text-slate-200 transition hover:bg-slate-800"
          onClick={() => update(value - step)}
          type="button"
        >
          <Minus size={18} />
        </button>
        <input
          className="min-w-0 bg-transparent px-2 py-3 text-center text-xl font-black text-white outline-none"
          inputMode={inputMode}
          min={0}
          onChange={(event) => update(Number(event.target.value))}
          type="number"
          value={formatted}
        />
        <button
          aria-label={`Aumentar ${label}`}
          className="tap-target flex items-center justify-center border-l border-slate-800 text-slate-200 transition hover:bg-slate-800"
          onClick={() => update(value + step)}
          type="button"
        >
          <Plus size={18} />
        </button>
      </div>
    </label>
  );
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function formatNumber(value: number, maxDecimals: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(maxDecimals);
}
