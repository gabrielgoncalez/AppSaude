import { CheckCircle2, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import type { SetKind, SetLog } from "../../types/training";

type SetLoggerProps = {
  lastSet?: SetLog;
  previousSet?: SetLog;
  nextIndex: number;
  targetSets: number;
  displayTotalSets?: number;
  setKind?: SetKind;
  setLabel?: string;
  isFinalSet?: boolean;
  initialReps?: number;
  initialDurationSec?: number;
  metricMode?: "reps" | "duration";
  weightLabel?: string;
  warmupOptional?: boolean;
  warmupNote?: string;
  warmupSuggestion?: string;
  onSaveSet: (set: SetLog) => void;
  onFinishExerciseSet: (set: SetLog) => void;
  onSkipWarmup?: () => void;
};

export function SetLogger({
  lastSet,
  previousSet,
  nextIndex,
  targetSets,
  displayTotalSets = targetSets,
  setKind = "work",
  setLabel,
  isFinalSet = false,
  initialReps = 8,
  initialDurationSec = 30,
  metricMode = "reps",
  weightLabel = "Carga kg",
  warmupOptional = false,
  warmupNote,
  warmupSuggestion,
  onSaveSet,
  onFinishExerciseSet,
  onSkipWarmup,
}: SetLoggerProps) {
  const base = useMemo(
    () => (setKind === "warmup" ? undefined : (lastSet ?? previousSet)),
    [lastSet, previousSet, setKind],
  );
  const [weightKg, setWeightKg] = useState<number>(base?.weightKg ?? 0);
  const [reps, setReps] = useState<number>(
    metricMode === "duration"
      ? (base?.durationSec ?? initialDurationSec)
      : (base?.reps ?? initialReps),
  );
  const actionLabel = isFinalSet ? "Finalizar exercício" : "Finalizar série";
  const resolvedSetLabel = setLabel ?? (setKind === "warmup" ? "Aquecimento" : "Trabalho");

  function finishSet() {
    const set: SetLog = {
      setIndex: nextIndex,
      setKind,
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
            {nextIndex} de {displayTotalSets}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
            {resolvedSetLabel}
            {warmupOptional && setKind === "warmup" ? " opcional" : ""}
          </p>
        </div>
        <p className="rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300">
          ajuste e finalize
        </p>
      </div>

      {setKind === "warmup" ? (
        <div className="mt-3 space-y-2 rounded-md border border-orange-400/25 bg-orange-400/10 px-3 py-2 text-sm font-bold text-orange-100">
          <p>
            {warmupNote ??
              "Série leve para preparar o padrão. Não conta para PR, volume ou progressão."}
          </p>
          {warmupSuggestion ? <p className="text-orange-50">{warmupSuggestion}</p> : null}
        </div>
      ) : null}

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
          label={metricMode === "duration" ? "Tempo (s)" : "Repetições"}
          onChange={setReps}
          step={metricMode === "duration" ? 5 : 1}
          value={reps}
        />
      </div>

      <Button className="mt-3 w-full" icon={<CheckCircle2 size={16} />} onClick={finishSet}>
        {actionLabel}
      </Button>
      {setKind === "warmup" && warmupOptional && onSkipWarmup ? (
        <Button className="mt-2 w-full" onClick={onSkipWarmup} variant="ghost">
          Pular aquecimento
        </Button>
      ) : null}
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
          onChange={(event) => {
            const parsed = Number(event.target.value.replace(",", "."));
            if (!Number.isNaN(parsed)) {
              onChange(parsed);
            }
          }}
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
