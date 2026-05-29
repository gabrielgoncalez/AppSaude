import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Eye,
  EyeOff,
  Download,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { formatDayName } from "../../lib/dates";
import type { AppData } from "../../types/appData";
import type { Exercise, ExerciseType, TrainingPlan, Workout } from "../../types/training";

type PlanPageProps = {
  data: AppData;
  plan: TrainingPlan;
  onUpdatePlan: (plan: TrainingPlan) => void;
  onImportMasterConfig: (config: MasterConfig) => void;
};

export type MasterConfig = {
  app: "gigante-agil";
  type: "master-config";
  exportedAt: string;
  plan: TrainingPlan;
  capoeiraMovements?: AppData["capoeiraMovements"];
  trainingPhases?: AppData["trainingPhases"];
  bodyGoals?: AppData["bodyGoals"];
  rewards?: AppData["rewards"];
  achievements?: AppData["achievements"];
};

export function PlanPage({ data, plan, onUpdatePlan, onImportMasterConfig }: PlanPageProps) {
  const [editing, setEditing] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<TrainingPlan | undefined>();
  const [importError, setImportError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const workouts = [...plan.workouts].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  function updateWorkout(updated: Workout) {
    onUpdatePlan({
      ...plan,
      workouts: plan.workouts.map((workout) =>
        workout.id === updated.id ? updated : workout,
      ),
    });
  }

  function updateExercise(workout: Workout, updated: Exercise) {
    updateWorkout({
      ...workout,
      exercises: (workout.exercises ?? []).map((exercise) =>
        exercise.id === updated.id ? updated : exercise,
      ),
    });
  }

  function updateBlockItem(workout: Workout, blockId: string, updated: Exercise) {
    updateWorkout({
      ...workout,
      workoutBlocks: (workout.workoutBlocks ?? []).map((block) =>
        block.id === blockId
          ? {
              ...block,
              items: block.items.map((item) => (item.id === updated.id ? updated : item)),
            }
          : block,
      ),
    });
  }

  function addExercise(workout: Workout) {
    const nextExercise: Exercise = {
      id: `exercicio-${crypto.randomUUID().slice(0, 8)}`,
      name: "Novo exercício",
      type: "hypertrophy",
      targetSets: 3,
      repMin: 8,
      repMax: 15,
      restSec: 90,
      incrementKg: 2.5,
      active: true,
    };
    updateWorkout({
      ...workout,
      exercises: [...(workout.exercises ?? []), nextExercise],
    });
  }

  function removeExercise(workout: Workout, exerciseId: string) {
    updateWorkout({
      ...workout,
      exercises: (workout.exercises ?? []).filter((exercise) => exercise.id !== exerciseId),
    });
  }

  function moveExercise(workout: Workout, exerciseId: string, direction: -1 | 1) {
    const exercises = [...(workout.exercises ?? [])];
    const index = exercises.findIndex((exercise) => exercise.id === exerciseId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= exercises.length) {
      return;
    }
    const [item] = exercises.splice(index, 1);
    exercises.splice(nextIndex, 0, item);
    updateWorkout({ ...workout, exercises });
  }

  function exportPlan() {
    const blob = new Blob([JSON.stringify({ app: "gigante-agil", type: "training-plan", plan }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gigante-agil-plano-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportMasterConfig() {
    const config: MasterConfig = {
      app: "gigante-agil",
      type: "master-config",
      exportedAt: new Date().toISOString(),
      plan,
      capoeiraMovements: data.capoeiraMovements,
      trainingPhases: data.trainingPhases,
      bodyGoals: data.bodyGoals,
      rewards: data.rewards,
      achievements: data.achievements,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gigante-agil-master-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importPlan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as { plan?: TrainingPlan; trainingPlan?: TrainingPlan; type?: string };
      if (parsed.type === "master-config" && parsed.plan?.workouts?.length) {
        onImportMasterConfig(parsed as MasterConfig);
        setImportError("");
        setPendingPlan(undefined);
        return;
      }
      const nextPlan = parsed.plan ?? parsed.trainingPlan;
      if (!nextPlan?.workouts?.length) {
        throw new Error("Plano inválido.");
      }
      setPendingPlan(nextPlan);
      setImportError("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Plano inválido.");
      setPendingPlan(undefined);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
            Plano semanal
          </p>
          <h2 className="text-2xl font-black text-white">Semana Gigante Ágil</h2>
        </div>
        <Button
          icon={editing ? <Save size={18} /> : <Edit3 size={18} />}
          onClick={() => setEditing((value) => !value)}
          variant="secondary"
        >
          {editing ? "Salvar" : "Editar plano"}
        </Button>
      </div>

      <Card>
        <h3 className="text-lg font-black text-white">Importar/exportar plano</h3>
        <p className="mt-2 text-sm text-slate-400">
          Use JSON para trocar cronogramas comigo sem perder as sessões antigas.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button icon={<Download size={18} />} onClick={exportPlan} variant="secondary">
            Exportar plano
          </Button>
          <Button icon={<Download size={18} />} onClick={exportMasterConfig} variant="secondary">
            Exportar master-config
          </Button>
          <Button
            icon={<Upload size={18} />}
            onClick={() => inputRef.current?.click()}
            variant="secondary"
          >
            Importar plano
          </Button>
        </div>
        <input
          accept="application/json"
          className="hidden"
          onChange={(event) => void importPlan(event)}
          ref={inputRef}
          type="file"
        />
        {importError ? <p className="mt-3 text-sm font-bold text-rose-200">{importError}</p> : null}
        {pendingPlan ? (
          <div className="mt-3 rounded-md border border-teal-400/30 bg-teal-400/10 p-3">
            <p className="text-sm font-bold text-teal-100">
              Plano encontrado: {pendingPlan.workouts.length} treinos,{" "}
              {pendingPlan.workouts.reduce(
                (sum, workout) => sum + (workout.exercises?.length ?? 0),
                0,
              )}{" "}
              exercícios.
            </p>
            <Button className="mt-3 w-full" onClick={() => {
              onUpdatePlan(pendingPlan);
              setPendingPlan(undefined);
            }}>
              Confirmar atualização
            </Button>
          </div>
        ) : null}
      </Card>

      {workouts.map((workout) => (
        <Card key={workout.id}>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {formatDayName(workout.dayOfWeek)}
          </p>
          {editing ? (
            <input
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-lg font-black text-white"
              onChange={(event) => updateWorkout({ ...workout, name: event.target.value })}
              value={workout.name}
            />
          ) : (
            <h3 className="mt-1 text-xl font-black text-white">{workout.name}</h3>
          )}

          {workout.blocks?.length ? (
            <div className="mt-3 grid gap-2">
              {workout.blocks.map((block) => (
                <div className="rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-300" key={block}>
                  {block}
                </div>
              ))}
            </div>
          ) : null}

          {workout.workoutBlocks?.length ? (
            <div className="mt-4 grid gap-3">
              {workout.workoutBlocks.map((block) => (
                <div
                  className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                  key={block.id}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
                    {block.name}
                  </p>
                  <div className="mt-2 grid gap-1 text-sm text-slate-300">
                    {block.items.map((item) => (
                      <div
                        className="flex items-center justify-between gap-2"
                        key={item.id}
                      >
                        <span>{item.displayName ?? item.name}</span>
                        <span className="text-xs text-slate-500">
                          {item.targetSets}x · {item.durationSec ? `${item.durationSec}s` : item.repMin && item.repMax ? `${item.repMin}-${item.repMax}` : item.kind ?? item.type}
                        </span>
                        {editing ? (
                          <button
                            className="rounded-md border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300"
                            onClick={() =>
                              updateBlockItem(workout, block.id, {
                                ...item,
                                active: item.active === false,
                              })
                            }
                            type="button"
                          >
                            {item.active === false ? "Ativar" : "Desativar"}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {workout.exercises?.length ? (
            <div className="mt-4 space-y-3">
              {workout.exercises.map((exercise, index) => (
                <div
                  className={`rounded-lg border border-slate-800 bg-slate-900/70 p-3 ${
                    exercise.active === false ? "opacity-60" : ""
                  }`}
                  key={exercise.id}
                >
                  {editing ? (
                    <div className="grid gap-3">
                      <div className="flex gap-2">
                        <IconButton
                          disabled={index === 0}
                          icon={<ArrowUp size={16} />}
                          label="Subir"
                          onClick={() => moveExercise(workout, exercise.id, -1)}
                        />
                        <IconButton
                          disabled={index === (workout.exercises?.length ?? 1) - 1}
                          icon={<ArrowDown size={16} />}
                          label="Descer"
                          onClick={() => moveExercise(workout, exercise.id, 1)}
                        />
                        <IconButton
                          icon={exercise.active === false ? <Eye size={16} /> : <EyeOff size={16} />}
                          label={exercise.active === false ? "Ativar" : "Desativar"}
                          onClick={() =>
                            updateExercise(workout, {
                              ...exercise,
                              active: exercise.active === false,
                            })
                          }
                        />
                        <IconButton
                          icon={<Trash2 size={16} />}
                          label="Remover"
                          onClick={() => removeExercise(workout, exercise.id)}
                        />
                      </div>

                      <input
                        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-bold text-white"
                        onChange={(event) =>
                          updateExercise(workout, { ...exercise, name: event.target.value })
                        }
                        value={exercise.name}
                      />

                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        <SelectField
                          label="Tipo"
                          onChange={(value) =>
                            updateExercise(workout, {
                              ...exercise,
                              type: value as ExerciseType,
                            })
                          }
                          options={[
                            "strength",
                            "hypertrophy",
                            "strength_technical",
                            "core",
                            "technical",
                            "cardio",
                            "prehab",
                            "optional",
                          ]}
                          value={exercise.type}
                        />
                        <NumberField
                          label="Séries"
                          onChange={(value) =>
                            updateExercise(workout, { ...exercise, targetSets: value })
                          }
                          value={exercise.targetSets}
                        />
                        <NumberField
                          label="Descanso"
                          onChange={(value) =>
                            updateExercise(workout, { ...exercise, restSec: value })
                          }
                          suffix="s"
                          value={exercise.restSec}
                        />
                        <NumberField
                          label="Incremento"
                          onChange={(value) =>
                            updateExercise(workout, { ...exercise, incrementKg: value })
                          }
                          step={0.5}
                          suffix="kg"
                          value={exercise.incrementKg ?? 0}
                        />
                        <NumberField
                          label="Rep min"
                          onChange={(value) =>
                            updateExercise(workout, { ...exercise, repMin: value })
                          }
                          value={exercise.repMin ?? 0}
                        />
                        <NumberField
                          label="Rep max"
                          onChange={(value) =>
                            updateExercise(workout, { ...exercise, repMax: value })
                          }
                          value={exercise.repMax ?? 0}
                        />
                        <TextField
                          label="Equipamento"
                          onChange={(value) =>
                            updateExercise(workout, { ...exercise, equipment: value || undefined })
                          }
                          value={exercise.equipment ?? ""}
                        />
                        <TextField
                          label="Músculos"
                          onChange={(value) =>
                            updateExercise(workout, {
                              ...exercise,
                              muscleGroups: parseCsv(value),
                            })
                          }
                          value={(exercise.muscleGroups ?? []).join(", ")}
                        />
                      </div>

                      <input
                        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        onChange={(event) =>
                          updateExercise(workout, {
                            ...exercise,
                            note: event.target.value || undefined,
                          })
                        }
                        placeholder="Observações"
                        value={exercise.note ?? ""}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-white">{exercise.name}</p>
                          <p className="text-sm text-slate-400">
                            {exercise.type}
                            {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                            {exercise.active === false ? " · inativo" : ""}
                          </p>
                        </div>
                        <p className="text-right text-sm font-bold text-teal-200">
                          {exercise.targetSets}x{exercise.repMin ?? "-"}-
                          {exercise.repMax ?? exercise.durationSec ?? "-"}
                        </p>
                      </div>
                      {exercise.muscleGroups?.length ? (
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {exercise.muscleGroups.join(", ")}
                        </p>
                      ) : null}
                      {exercise.note ? (
                        <p className="mt-2 text-sm text-orange-200">{exercise.note}</p>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {editing ? (
            <Button
              className="mt-4 w-full"
              icon={<Plus size={18} />}
              onClick={() => addExercise(workout)}
              variant="secondary"
            >
              Adicionar exercício
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  suffix?: string;
  step?: number;
  onChange: (value: number) => void;
};

function NumberField({ label, value, suffix, step = 1, onChange }: NumberFieldProps) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <div className="mt-1 flex overflow-hidden rounded-md border border-slate-700 bg-slate-950">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white"
          inputMode="decimal"
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          step={step}
          type="number"
          value={value}
        />
        {suffix ? <span className="px-2 py-2 text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextField({ label, value, onChange }: TextFieldProps) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <input
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type IconButtonProps = {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

function IconButton({ icon, label, disabled, onClick }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className="tap-target inline-flex items-center justify-center rounded-md bg-slate-800 px-3 py-2 text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function parseCsv(value: string): string[] | undefined {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}
