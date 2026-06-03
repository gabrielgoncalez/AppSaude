import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ListChecks,
  Search,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import {
  getCompletionKey,
  isActiveDailyItem,
  isDailyBlockCompleted,
  isDailyItemCompleted,
  isRequiredItem,
  unique,
  type RequiredItemContext,
} from "../../lib/dailyCompletion";
import type {
  PrescribedBlock,
  PrescribedItem,
  PrescribedVariantOption,
  TodayPrescription,
} from "../../lib/prescriptionEngine";
import { openReferenceVideoSearch } from "../../lib/referenceSearch";
import { isStrengthExercise } from "../../lib/workoutItems";
import type {
  Exercise,
  ExerciseLog,
  SetLog,
  SkillWorkoutMetrics,
  TechnicalMetricValue,
  TechnicalBlockLog,
  TrainingSession,
  Workout,
} from "../../types/training";
import { ExerciseCard } from "./ExerciseCard";
import {
  clampQueueIndex,
  findNextPendingIndex,
  findPreviousPendingIndex,
} from "./dailyQueueNavigation";
import { shouldShowItemMetrics } from "./itemMetricVisibility";

type DailyWorkoutRunnerProps = {
  workout: Workout;
  session?: TrainingSession;
  sessions: TrainingSession[];
  previousSets: Map<string, SetLog>;
  prescription?: TodayPrescription;
  onAddSet: (exercise: Exercise, set: SetLog) => void;
  onFinishExerciseSet: (exercise: Exercise, set: SetLog) => void;
  onCompleteChecklistItem: (block: PrescribedBlock, item: Exercise) => void;
  onCompleteChecklistItemAndWorkout: (block: PrescribedBlock, item: Exercise) => void;
  onCompleteSkillWorkout: (metrics: SkillWorkoutMetrics) => void;
  onCompleteWorkout: () => void;
  capoeiraHasNewMovement?: boolean;
};

type DailyQueueItem = {
  block: PrescribedBlock;
  item: PrescribedItem;
  exercise: Exercise;
};

type DisplayQueueItem = DailyQueueItem & {
  variantLocked?: boolean;
};

type MetricKey =
  | "durationMin"
  | "rounds"
  | "errors"
  | "hits"
  | "attempts"
  | "cleanStreakSec";

type MetricFieldConfig = {
  number: Array<{ key: MetricKey; label: string; suffix: string }>;
  technicalNumber: Array<{
    key: string;
    label: string;
    suffix: string;
    min?: number;
    max?: number;
  }>;
  rating: Array<{ key: string; label: string }>;
  boolean: Array<{ key: string; label: string }>;
  select: Array<{ key: string; label: string; options: string[] }>;
  text: Array<{ key: string; label: string }>;
  notes: boolean;
};

type MetricsByItem = Record<string, SkillWorkoutMetrics>;

type ExecutionPanelProps = {
  completed: boolean;
  label: string;
  onComplete: () => void;
};

export function DailyWorkoutRunner({
  workout,
  session,
  sessions,
  previousSets,
  prescription,
  onAddSet,
  onFinishExerciseSet,
  onCompleteChecklistItem,
  onCompleteChecklistItemAndWorkout,
  onCompleteSkillWorkout,
  onCompleteWorkout,
  capoeiraHasNewMovement,
}: DailyWorkoutRunnerProps) {
  const [sequenceOpen, setSequenceOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [metricsByItem, setMetricsByItem] = useState<MetricsByItem>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const blocks = useMemo(
    () => prescription?.prescribedBlocks ?? [],
    [prescription?.prescribedBlocks],
  );
  const isStrengthWorkout = Boolean(prescription?.exercises.length);
  const requiredContext = useMemo<RequiredItemContext>(
    () => ({
      capoeiraHasNewMovement,
      isTestExposure: prescription?.wave === "consolidation",
    }),
    [capoeiraHasNewMovement, prescription?.wave],
  );
  const queue = useMemo(() => flattenBlocks(blocks), [blocks]);
  const isCompleted = (entry: DailyQueueItem) => isEntryCompleted(entry, session);
  const completedEntries = queue.filter(isCompleted);
  const incompleteQueue = queue.filter((entry) => !isCompleted(entry));
  const safeActiveIndex = clampQueueIndex(queue.length, activeIndex);
  const activeEntry = safeActiveIndex >= 0 ? queue[safeActiveIndex] : undefined;
  const resolvedActiveIndex =
    activeEntry && !isCompleted(activeEntry)
      ? safeActiveIndex
      : findNextPendingIndex(queue, Math.max(safeActiveIndex, 0), isCompleted);
  const current = resolvedActiveIndex >= 0 ? queue[resolvedActiveIndex] : incompleteQueue[0];
  const currentIndex = current ? queue.findIndex((entry) => isSameEntry(entry, current)) : -1;
  const nextIndex = current
    ? findNextPendingIndex(queue, currentIndex, isCompleted, false)
    : -1;
  const previousIndex = current
    ? findPreviousPendingIndex(queue, currentIndex, isCompleted)
    : -1;
  const next = nextIndex >= 0 ? queue[nextIndex] : undefined;
  const previous = previousIndex >= 0 ? queue[previousIndex] : undefined;
  const displayedCurrent = current
    ? applySelectedVariant(current, selectedVariants, session?.exercises ?? [])
    : undefined;
  const currentMetricsKey = current ? getEntryKey(current) : undefined;
  const currentMetrics = currentMetricsKey
    ? (metricsByItem[currentMetricsKey] ?? getInitialMetrics(workout.id))
    : getInitialMetrics(workout.id);
  const requiredEntries = queue.filter((entry) =>
    isRequiredItem(entry.block, entry.exercise, requiredContext),
  );
  const incompleteRequiredEntries = requiredEntries.filter(
    (entry) => !isEntryCompleted(entry, session),
  );
  const currentIsLastRequired =
    Boolean(current) &&
    incompleteRequiredEntries.length === 1 &&
    isSameEntry(incompleteRequiredEntries[0], current);
  const currentIsLastActive =
    Boolean(current) &&
    incompleteQueue.length === 1 &&
    isSameEntry(incompleteQueue[0], current);
  const shouldFinishOnCurrent =
    currentIsLastRequired || (!requiredEntries.length && currentIsLastActive);

  function goToQueueIndex(index: number) {
    if (index >= 0) {
      setActiveIndex(index);
    }
  }

  function selectVariant(entry: DailyQueueItem, exerciseId: string) {
    setSelectedVariants((currentVariants) => ({
      ...currentVariants,
      [getEntryKey(entry)]: exerciseId,
    }));
  }

  function setNumber(key: MetricKey, value: number | undefined) {
    setCurrentMetrics((itemMetrics) => ({ ...itemMetrics, [key]: value }));
  }

  function setRating(key: string, value: 1 | 2 | 3 | 4 | 5) {
    setCurrentMetrics((itemMetrics) => ({
      ...itemMetrics,
      technicalRatings: {
        ...(itemMetrics.technicalRatings ?? {}),
        [key]: value,
      },
    }));
  }

  function setTechnicalValue(key: string, value: TechnicalMetricValue) {
    setCurrentMetrics((itemMetrics) => ({
      ...itemMetrics,
      technicalValues: {
        ...(itemMetrics.technicalValues ?? {}),
        [key]: value,
      },
    }));
  }

  function setNotes(notes: string) {
    setCurrentMetrics((itemMetrics) => ({ ...itemMetrics, notes }));
  }

  function setCurrentMetrics(
    updater: (itemMetrics: SkillWorkoutMetrics) => SkillWorkoutMetrics,
  ) {
    if (!currentMetricsKey) {
      return;
    }
    setMetricsByItem((currentByItem) => ({
      ...currentByItem,
      [currentMetricsKey]: updater(
        currentByItem[currentMetricsKey] ?? getInitialMetrics(workout.id),
      ),
    }));
  }

  function getCompletedStateWith(entry?: DailyQueueItem) {
    const completedItems = entry
      ? addEntryCompletion(session?.completedItems ?? [], entry)
      : unique(session?.completedItems ?? []);
    const completedBlocks = getCompletedBlockIds(
      blocks,
      completedItems,
      session?.exercises ?? [],
      requiredContext,
    );
    return { completedBlocks, completedItems };
  }

  function finishTechnicalWith(entry: DailyQueueItem) {
    const { completedBlocks, completedItems } = getCompletedStateWith(entry);
    const scopedMetrics = withEntryMetrics(metricsByItem, entry, currentMetrics, workout.id);
    onCompleteSkillWorkout({
      ...currentMetrics,
      status: "completed",
      completedBlocks,
      completedItems,
      technicalBlocks: buildTechnicalBlocks(workout, blocks, scopedMetrics, {
        completedItems,
        completedBlocks,
      }),
    });
  }

  function savePartial(entry?: DailyQueueItem) {
    const { completedBlocks, completedItems } = getCompletedStateWith(entry);
    const scopedMetrics = entry
      ? withEntryMetrics(metricsByItem, entry, currentMetrics, workout.id)
      : metricsByItem;
    onCompleteSkillWorkout({
      ...currentMetrics,
      status: "partial",
      completedBlocks,
      completedItems,
      technicalBlocks: buildTechnicalBlocks(workout, blocks, scopedMetrics, {
        completedItems,
        completedBlocks,
      }),
    });
  }

  function finishTechnicalMission() {
    const { completedBlocks, completedItems } = getCompletedStateWith();
    onCompleteSkillWorkout({
      ...getInitialMetrics(workout.id),
      status: "completed",
      completedBlocks,
      completedItems,
      technicalBlocks: buildTechnicalBlocks(workout, blocks, metricsByItem, {
        completedItems,
        completedBlocks,
      }),
    });
  }

  function completeCurrentItem(entry: DailyQueueItem) {
    if (shouldFinishOnCurrent) {
      if (isStrengthWorkout) {
        onCompleteChecklistItemAndWorkout(entry.block, entry.exercise);
      } else {
        finishTechnicalWith(entry);
      }
      return;
    }
    onCompleteChecklistItem(entry.block, entry.exercise);
  }

  if (!blocks.length) {
    return (
      <Card>
        <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
          Missao vazia
        </p>
        <p className="mt-2 text-slate-300">
          Nao ha itens ativos para este treino.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {completedOpen ? (
        <CompletedItemsDrawer entries={completedEntries} />
      ) : null}

      {current && displayedCurrent ? (
        isSetEntry(displayedCurrent) ? (
          <ExerciseCard
            currentSessionId={session?.id}
            exercise={displayedCurrent.exercise}
            key={`${current.block.id}:${current.exercise.id}:${displayedCurrent.exercise.id}`}
            log={findExerciseLog(session?.exercises ?? [], displayedCurrent.exercise)}
            onAddSet={onAddSet}
            onFinishExerciseSet={onFinishExerciseSet}
            onSelectVariant={(exerciseId) => selectVariant(current, exerciseId)}
            prescribedExerciseId={current.item.exercise.id}
            prescription={displayedCurrent.item.prescription}
            previousSet={previousSets.get(displayedCurrent.exercise.id)}
            sessions={sessions}
            variantLocked={displayedCurrent.variantLocked}
            variantOptions={current.item.variantOptions}
            workout={workout}
          />
        ) : (
          <TrainingItemCard
            block={current.block}
            completed={isEntryCompleted(current, session)}
            exercise={current.exercise}
            metrics={currentMetrics}
            onComplete={() => completeCurrentItem(current)}
            onSetNumber={setNumber}
            onSetRating={setRating}
            onSetTechnicalValue={setTechnicalValue}
            onSetNotes={setNotes}
            primaryLabel={shouldFinishOnCurrent ? "Finalizar missao" : "Finalizar item"}
            progressLabel={`${completedEntries.length}/${queue.length} cards feitos${prescription?.waveLabel ? ` - ${prescription.waveLabel}` : ""}`}
            workout={workout}
          />
        )
      ) : (
        <Card>
          <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
            Tudo feito
          </p>
          <p className="mt-2 text-slate-300">
            Todos os cards ativos foram marcados.
          </p>
          {isStrengthWorkout ? (
            <Button className="mt-3 w-full py-3" onClick={onCompleteWorkout}>
              Finalizar missao
            </Button>
          ) : (
            <Button className="mt-3 w-full py-3" onClick={finishTechnicalMission}>
              Finalizar missao
            </Button>
          )}
        </Card>
      )}

      {next ? (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Proximo
          </p>
          <p className="mt-1 font-black text-white">{getItemName(next.exercise)}</p>
          <p className="mt-1 text-sm text-slate-400">
            {getItemCategory(next.exercise, next.block)}
          </p>
        </Card>
      ) : null}

      {current ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={!previous}
            icon={<ChevronLeft size={17} />}
            onClick={() => goToQueueIndex(previousIndex)}
            variant="ghost"
          >
            Anterior
          </Button>
          <Button
            disabled={!next}
            icon={<ChevronRight size={17} />}
            onClick={() => goToQueueIndex(nextIndex)}
            variant="ghost"
          >
            Proximo
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          icon={<ListChecks size={17} />}
          onClick={() => setSequenceOpen(true)}
          variant="ghost"
        >
          Ver sequencia
        </Button>
        {completedEntries.length ? (
          <Button
            icon={completedOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            onClick={() => setCompletedOpen((value) => !value)}
            variant="ghost"
          >
            Concluidos
          </Button>
        ) : null}
        {!isStrengthWorkout && current && completedEntries.length ? (
          <Button onClick={() => savePartial()} variant="ghost">
            Salvar parcial
          </Button>
        ) : null}
      </div>

      {sequenceOpen ? (
        <RouteOverviewModal
          blocks={blocks}
          completedItems={session?.completedItems ?? []}
          exerciseLogs={session?.exercises ?? []}
          onClose={() => setSequenceOpen(false)}
          onCompleteItem={onCompleteChecklistItem}
          workout={workout}
        />
      ) : null}
    </div>
  );
}

function TrainingItemCard({
  block,
  exercise,
  completed,
  metrics,
  primaryLabel,
  progressLabel,
  workout,
  onComplete,
  onSetNumber,
  onSetRating,
  onSetTechnicalValue,
  onSetNotes,
}: {
  block: PrescribedBlock;
  exercise: Exercise;
  completed: boolean;
  metrics: SkillWorkoutMetrics;
  primaryLabel: string;
  progressLabel: string;
  workout: Workout;
  onComplete: () => void;
  onSetNumber: (key: MetricKey, value: number | undefined) => void;
  onSetRating: (key: string, value: 1 | 2 | 3 | 4 | 5) => void;
  onSetTechnicalValue: (key: string, value: TechnicalMetricValue) => void;
  onSetNotes: (notes: string) => void;
}) {
  const showMetrics = shouldShowItemMetrics(block, exercise);
  const showTimer = shouldShowTimer(block, exercise, workout);
  return (
    <ExecutionCardShell
      block={block}
      exercise={exercise}
      progressLabel={progressLabel}
      workout={workout}
    >
      {showMetrics ? (
        <MetricExecutionPanel
          completed={completed}
          exercise={exercise}
          label={completed ? "Feito - tocar para desfazer" : primaryLabel}
          metrics={metrics}
          onComplete={onComplete}
          onSetNumber={onSetNumber}
          onSetRating={onSetRating}
          onSetTechnicalValue={onSetTechnicalValue}
          onSetNotes={onSetNotes}
          workout={workout}
        />
      ) : showTimer ? (
        <TimerExecutionPanel
          completed={completed}
          exercise={exercise}
          label={completed ? "Feito - tocar para desfazer" : primaryLabel}
          onComplete={onComplete}
        />
      ) : (
        <SimpleExecutionPanel
          completed={completed}
          label={completed ? "Feito - tocar para desfazer" : primaryLabel}
          onComplete={onComplete}
        />
      )}
    </ExecutionCardShell>
  );
}

function ExecutionCardShell({
  block,
  children,
  exercise,
  progressLabel,
  workout,
}: {
  block: PrescribedBlock;
  children: ReactNode;
  exercise: Exercise;
  progressLabel: string;
  workout: Workout;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const details = exercise.cues?.filter(Boolean) ?? [];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
            {getItemCategory(exercise, block)}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="text-2xl font-black text-white">{getItemName(exercise)}</h3>
            <button
              aria-label={`Pesquisar video para ${getItemName(exercise)}`}
              className="tap-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-teal-300 hover:text-teal-200"
              onClick={() => openReferenceVideoSearch(exercise, workout)}
              title="Pesquisar video"
              type="button"
            >
              <Search size={17} />
            </button>
          </div>
        </div>
        {shouldShowTimer(block, exercise, workout) ? (
          <Timer className="shrink-0 text-orange-300" size={23} />
        ) : null}
      </div>

      <p className="mt-2 text-sm text-slate-400">{progressLabel}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
        {formatItemTarget(exercise).map((label) => (
          <span className="rounded-md bg-slate-800 px-2 py-1" key={label}>
            {label}
          </span>
        ))}
        {exercise.equipment ? (
          <span className="rounded-md bg-orange-400/15 px-2 py-1 text-orange-100">
            {exercise.equipment}
          </span>
        ) : null}
        {exercise.movementPattern ? (
          <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-200">
            {exercise.movementPattern.replaceAll("-", " ")}
          </span>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm">
        <div className="mb-1 flex items-center gap-2 font-bold text-white">
          <Zap size={16} />
          <span>Meta</span>
        </div>
        <p className="text-slate-300">{exercise.note ?? getDefaultItemMessage(exercise)}</p>
      </div>

      {details.length ? (
        <div className="mt-3 overflow-hidden rounded-md bg-slate-950">
          <button
            className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-bold text-white"
            onClick={() => setDetailsOpen((value) => !value)}
            type="button"
          >
            <span>Detalhes</span>
            {detailsOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
          {detailsOpen ? (
            <div className="grid gap-2 border-t border-slate-800 p-3">
              {details.map((cue) => (
                <p className="rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-300" key={cue}>
                  {cue}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {children}
    </Card>
  );
}

function SimpleExecutionPanel({ completed, label, onComplete }: ExecutionPanelProps) {
  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-3">
      <Button
        className="w-full py-4"
        icon={<CheckCircle2 size={18} />}
        onClick={onComplete}
        variant={completed ? "secondary" : "primary"}
      >
        {label}
      </Button>
    </div>
  );
}

function TimerExecutionPanel({
  completed,
  exercise,
  label,
  onComplete,
}: ExecutionPanelProps & { exercise: Exercise }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-3">
      <SimpleTimer seconds={exercise.durationSec ?? 120} />
      <Button
        className="mt-3 w-full py-4"
        icon={<CheckCircle2 size={18} />}
        onClick={onComplete}
        variant={completed ? "secondary" : "primary"}
      >
        {label}
      </Button>
    </div>
  );
}

function MetricExecutionPanel({
  completed,
  exercise,
  label,
  metrics,
  workout,
  onComplete,
  onSetNumber,
  onSetRating,
  onSetTechnicalValue,
  onSetNotes,
}: ExecutionPanelProps & {
  exercise: Exercise;
  metrics: SkillWorkoutMetrics;
  workout: Workout;
  onSetNumber: (key: MetricKey, value: number | undefined) => void;
  onSetRating: (key: string, value: 1 | 2 | 3 | 4 | 5) => void;
  onSetTechnicalValue: (key: string, value: TechnicalMetricValue) => void;
  onSetNotes: (notes: string) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-3">
      <MetricRenderer
        exercise={exercise}
        metrics={metrics}
        onSetNumber={onSetNumber}
        onSetRating={onSetRating}
        onSetTechnicalValue={onSetTechnicalValue}
        onSetNotes={onSetNotes}
        workout={workout}
      />
      <Button
        className="mt-3 w-full py-4"
        icon={<CheckCircle2 size={18} />}
        onClick={onComplete}
        variant={completed ? "secondary" : "primary"}
      >
        {label}
      </Button>
    </div>
  );
}

function MetricRenderer({
  exercise,
  metrics,
  workout,
  onSetNumber,
  onSetRating,
  onSetTechnicalValue,
  onSetNotes,
}: {
  exercise: Exercise;
  metrics: SkillWorkoutMetrics;
  workout: Workout;
  onSetNumber: (key: MetricKey, value: number | undefined) => void;
  onSetRating: (key: string, value: 1 | 2 | 3 | 4 | 5) => void;
  onSetTechnicalValue: (key: string, value: TechnicalMetricValue) => void;
  onSetNotes: (notes: string) => void;
}) {
  const fields = getMetricFields(workout, exercise);
  if (
    !fields.number.length &&
    !fields.technicalNumber.length &&
    !fields.rating.length &&
    !fields.boolean.length &&
    !fields.select.length &&
    !fields.text.length &&
    !fields.notes
  ) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        Registro do card
      </p>
      {fields.number.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fields.number.map((field) => (
            <NumberField
              key={field.key}
              label={field.label}
              onChange={(value) => onSetNumber(field.key, value)}
              suffix={field.suffix}
              value={metrics[field.key]}
            />
          ))}
        </div>
      ) : null}
      {fields.technicalNumber.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fields.technicalNumber.map((field) => {
            const value = metrics.technicalValues?.[field.key];
            return (
              <NumberField
                key={field.key}
                label={field.label}
                max={field.max}
                min={field.min}
                onChange={(nextValue) => onSetTechnicalValue(field.key, nextValue)}
                suffix={field.suffix}
                value={typeof value === "number" ? value : undefined}
              />
            );
          })}
        </div>
      ) : null}
      {fields.rating.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {fields.rating.map((field) => (
            <RatingField
              key={field.key}
              label={field.label}
              onChange={(value) => onSetRating(field.key, value)}
              value={metrics.technicalRatings?.[field.key] ?? 3}
            />
          ))}
        </div>
      ) : null}
      {fields.boolean.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fields.boolean.map((field) => (
            <CheckboxField
              key={field.key}
              label={field.label}
              onChange={(value) => onSetTechnicalValue(field.key, value)}
              value={Boolean(metrics.technicalValues?.[field.key])}
            />
          ))}
        </div>
      ) : null}
      {fields.select.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fields.select.map((field) => (
            <SelectField
              key={field.key}
              label={field.label}
              onChange={(value) => onSetTechnicalValue(field.key, value)}
              options={field.options}
              value={String(metrics.technicalValues?.[field.key] ?? field.options[0])}
            />
          ))}
        </div>
      ) : null}
      {fields.text.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fields.text.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              onChange={(value) => onSetTechnicalValue(field.key, value)}
              value={String(metrics.technicalValues?.[field.key] ?? "")}
            />
          ))}
        </div>
      ) : null}
      {fields.notes ? (
        <TextAreaField label="Notas rapidas" onChange={onSetNotes} value={metrics.notes ?? ""} />
      ) : null}
    </div>
  );
}

function CompletedItemsDrawer({ entries }: { entries: DailyQueueItem[] }) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        Concluidos hoje
      </p>
      <div className="mt-2 grid gap-2">
        {entries.map((entry) => (
          <div
            className="flex items-center justify-between rounded-md bg-slate-950 px-3 py-2 text-sm"
            key={`${entry.block.id}:${entry.exercise.id}`}
          >
            <span className="font-bold text-slate-100">{getItemName(entry.exercise)}</span>
            <span className="text-slate-500">{getItemCategory(entry.exercise, entry.block)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RouteOverviewModal({
  blocks,
  completedItems,
  exerciseLogs,
  onClose,
  onCompleteItem,
  workout,
}: {
  blocks: PrescribedBlock[];
  completedItems: string[];
  exerciseLogs: ExerciseLog[];
  onClose: () => void;
  onCompleteItem: (block: PrescribedBlock, item: Exercise) => void;
  workout: Workout;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/80 p-3 sm:items-center sm:justify-center">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-4 shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
              Sequencia
            </p>
            <h3 className="mt-1 text-xl font-black text-white">Cards do dia</h3>
          </div>
          <button
            aria-label="Fechar sequencia"
            className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-300"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {blocks.flatMap((block) =>
            block.items
              .filter(({ exercise }) => isActiveDailyItem(exercise))
              .map(({ exercise }) => {
                const done = isDailyItemCompleted({
                  blockId: block.id,
                  item: exercise,
                  completedItems,
                  exerciseLogs,
                });
                return (
                  <div
                    className={`rounded-lg border p-3 ${
                      done
                        ? "border-teal-400/30 bg-teal-400/10"
                        : "border-slate-800 bg-slate-900"
                    }`}
                    key={`${block.id}:${exercise.id}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {getItemCategory(exercise, block)}
                        </p>
                        <p className="mt-1 font-black text-white">{getItemName(exercise)}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          aria-label={`Pesquisar video para ${getItemName(exercise)}`}
                          className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:border-teal-300 hover:text-teal-200"
                          onClick={() => openReferenceVideoSearch(exercise, workout)}
                          title="Pesquisar video"
                          type="button"
                        >
                          <Search size={16} />
                        </button>
                        <button
                          className={`tap-target inline-flex h-10 min-w-20 items-center justify-center rounded-md px-3 text-sm font-bold transition ${
                            done
                              ? "bg-teal-400/15 text-teal-100"
                              : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                          }`}
                          onClick={() => onCompleteItem(block, exercise)}
                          type="button"
                        >
                          {done ? "Feito" : "Fazer"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }),
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  return (
    <div className="rounded-lg border border-orange-300/25 bg-orange-400/10 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-orange-100">Timer</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-3xl font-black text-white">{formatDurationClock(remaining)}</p>
        <div className="flex gap-2">
          <Button onClick={() => setRunning((value) => !value)} variant="secondary">
            {running ? "Pausar" : "Iniciar"}
          </Button>
          <Button
            onClick={() => {
              setRunning(false);
              setRemaining(seconds);
            }}
            variant="ghost"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function flattenBlocks(blocks: PrescribedBlock[]): DailyQueueItem[] {
  return blocks.flatMap((block) =>
    block.items
      .filter(({ exercise }) => isActiveDailyItem(exercise))
      .map((item) => ({
        block,
        item,
        exercise: item.exercise,
      })),
  );
}

function isEntryCompleted(entry: DailyQueueItem, session?: TrainingSession): boolean {
  if (isDailyItemCompleted({
    blockId: entry.block.id,
    item: entry.exercise,
    completedItems: session?.completedItems ?? [],
    exerciseLogs: session?.exercises ?? [],
  })) {
    return true;
  }

  return getVariantExercises(entry).some((exercise) =>
    isDailyItemCompleted({
      blockId: entry.block.id,
      item: exercise,
      completedItems: session?.completedItems ?? [],
      exerciseLogs: session?.exercises ?? [],
    }),
  );
}

function isSameEntry(left: DailyQueueItem | undefined, right: DailyQueueItem | undefined): boolean {
  return Boolean(
    left &&
      right &&
      left.block.id === right.block.id &&
      left.exercise.id === right.exercise.id,
  );
}

function getEntryKey(entry: DailyQueueItem): string {
  return getCompletionKey(entry.block.id, entry.exercise.id);
}

function applySelectedVariant(
  entry: DailyQueueItem,
  selectedVariants: Record<string, string>,
  exerciseLogs: ExerciseLog[],
): DisplayQueueItem {
  const variantOptions = entry.item.variantOptions;
  if (!variantOptions?.length) {
    return entry;
  }

  const lockedOption = getLoggedVariantOption(variantOptions, exerciseLogs);
  const selectedId = lockedOption?.exercise.id ?? selectedVariants[getEntryKey(entry)];
  const selectedOption =
    variantOptions.find((option) => option.exercise.id === selectedId) ??
    variantOptions.find((option) => option.isPrescribed) ??
    variantOptions[0];

  return {
    ...entry,
    item: {
      ...entry.item,
      exercise: selectedOption.exercise,
      prescription: selectedOption.prescription,
    },
    exercise: selectedOption.exercise,
    variantLocked: Boolean(lockedOption),
  };
}

function withEntryMetrics(
  metricsByItem: MetricsByItem,
  entry: DailyQueueItem,
  metrics: SkillWorkoutMetrics,
  workoutId: string,
): MetricsByItem {
  return {
    ...metricsByItem,
    [getEntryKey(entry)]: {
      ...getInitialMetrics(workoutId),
      ...metrics,
    },
  };
}

function isSetEntry(entry: DailyQueueItem): boolean {
  return entry.block.blockMode === "sets" && isStrengthExercise(entry.exercise);
}

function findExerciseLog(logs: ExerciseLog[], exercise: Exercise): ExerciseLog | undefined {
  return logs.find(
    (log) =>
      log.exerciseId === exercise.id || Boolean(exercise.legacyIds?.includes(log.exerciseId)),
  );
}

function getLoggedVariantOption(
  variantOptions: PrescribedVariantOption[],
  logs: ExerciseLog[],
): PrescribedVariantOption | undefined {
  return variantOptions.find((option) => {
    const log = findExerciseLog(logs, option.exercise);
    return Boolean(log?.sets.length);
  });
}

function getVariantExercises(entry: DailyQueueItem): Exercise[] {
  return entry.item.variantOptions?.map((option) => option.exercise) ?? [];
}

function addEntryCompletion(completedItems: string[], entry: DailyQueueItem): string[] {
  return unique([
    ...completedItems,
    getCompletionKey(entry.block.id, entry.exercise.id),
  ]);
}

function getCompletedBlockIds(
  blocks: PrescribedBlock[],
  completedItems: string[],
  exerciseLogs: ExerciseLog[],
  requiredContext: RequiredItemContext,
): string[] {
  return blocks
    .filter((block) =>
      isDailyBlockCompleted({
        block,
        completedItems,
        exerciseLogs,
        requiredContext,
      }),
    )
    .map((block) => block.id);
}

function buildTechnicalBlocks(
  workout: Workout,
  blocks: PrescribedBlock[],
  metricsByItem: MetricsByItem,
  state: {
    completedBlocks: string[];
    completedItems: string[];
  },
): TechnicalBlockLog[] {
  const completedAt = new Date().toISOString();
  return blocks.map((block) => {
    const blockCompleted = state.completedBlocks.includes(block.id);
    const items = block.items
      .map((item) => item.exercise)
      .filter(isActiveDailyItem)
      .map((item) => {
        const itemCompleted = state.completedItems.some((key) =>
          [getCompletionKey(block.id, item.id), item.id].includes(key),
        );
        const hasMetrics = shouldShowItemMetrics(block, item);
        const itemMetrics =
          metricsByItem[getCompletionKey(block.id, item.id)] ?? getInitialMetrics(workout.id);
        return {
          itemId: item.id,
          itemName: getItemName(item),
          completed: itemCompleted,
          completedAt: itemCompleted ? completedAt : undefined,
          metricValues: hasMetrics && itemCompleted
            ? {
                durationMin: itemMetrics.durationMin,
                rounds: itemMetrics.rounds,
                errors: itemMetrics.errors,
                hits: itemMetrics.hits,
                attempts: itemMetrics.attempts,
                cleanStreakSec: itemMetrics.cleanStreakSec,
                quality1to5: itemMetrics.quality1to5,
                ...(itemMetrics.technicalValues ?? {}),
                workoutId: workout.id,
              }
            : undefined,
          technicalRatings: hasMetrics && itemCompleted ? itemMetrics.technicalRatings : undefined,
          notes: hasMetrics && itemCompleted ? itemMetrics.notes : undefined,
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

function shouldShowTimer(
  block: PrescribedBlock,
  exercise: Exercise,
  workout: Workout,
): boolean {
  if (!exercise.durationSec || shouldShowItemMetrics(block, exercise)) {
    return false;
  }

  if (block.blockMode === "rounds" || block.type === "rounds" || exercise.kind === "rounds") {
    return true;
  }

  if (
    block.type === "base_body" ||
    exercise.kind === "base_body" ||
    exercise.type === "base_body"
  ) {
    return true;
  }

  if (workout.modality === "basketball" && exercise.type === "technical") {
    return true;
  }

  if (workout.modality === "capoeira" && exercise.kind === "capoeira_movement") {
    return true;
  }

  if (exercise.kind === "capoeira_movement") {
    return true;
  }

  if (workout.modality === "boxing" && block.id === "boxe-sombra") {
    return true;
  }

  return false;
}

function getMetricFields(workout: Workout, exercise: Exercise): MetricFieldConfig {
  if (exercise.kind === "dance_external" || exercise.type === "dance_external") {
    return {
      number: [{ key: "durationMin" as const, label: "Duracao feita", suffix: "min" }],
      technicalNumber: [
        { key: "dance_note_tag", label: "Nota #", suffix: "", min: 1, max: 999 },
      ],
      rating: [{ key: "dance_fluency", label: "Fluidez" }],
      boolean: [],
      select: [],
      text: [],
      notes: true,
    };
  }
  if (exercise.kind === "capoeira_movement" || workout.modality === "capoeira") {
    return {
      number: [{ key: "durationMin" as const, label: "Duracao", suffix: "min" }],
      technicalNumber: [],
      rating: [
        { key: "capoeira_quality", label: "Qualidade" },
        { key: "capoeira_fluency", label: "Fluidez" },
      ],
      boolean: [
        { key: "capoeira_right_side", label: "Lado direito" },
        { key: "capoeira_left_side", label: "Lado esquerdo" },
      ],
      select: [
        {
          key: "capoeira_status",
          label: "Status",
          options: ["nao_iniciado", "aprendendo", "em_validacao", "dominado", "revisao"],
        },
      ],
      text: [],
      notes: true,
    };
  }
  if (workout.modality === "basketball") {
    return {
      number: [
        { key: "errors" as const, label: "Perdas", suffix: "" },
        { key: "cleanStreakSec" as const, label: "Sequencia limpa", suffix: "s" },
      ],
      technicalNumber: [],
      rating: [
        { key: "basketball_eyes_up", label: "Olhos para cima" },
        { key: "basketball_weak_hand", label: "Mao fraca" },
        { key: "basketball_body_control", label: "Controle corporal" },
      ],
      boolean: [],
      select: [],
      text: [],
      notes: false,
    };
  }
  if (workout.modality === "boxing") {
    return {
      number: [
        { key: "hits" as const, label: "Acertos", suffix: "" },
        { key: "attempts" as const, label: "Tentativas", suffix: "" },
      ],
      technicalNumber: [],
      rating: [
        { key: "boxing_guard", label: "Guarda" },
        { key: "boxing_base", label: "Base" },
        { key: "boxing_breathing", label: "Respiracao" },
      ],
      boolean: [],
      select: [],
      text: [],
      notes: false,
    };
  }
  return {
    number: [],
    technicalNumber: [],
    rating: [],
    boolean: [],
    select: [],
    text: [],
    notes: false,
  };
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
      technicalRatings: { dance_fluency: 3 },
    };
  }
  if (workoutId === "capoeira") {
    return {
      durationMin: 30,
      technicalRatings: { capoeira_quality: 3, capoeira_control: 3, capoeira_fluency: 3 },
    };
  }
  return { durationMin: 20, quality1to5: 3 };
}

function formatItemTarget(item: Exercise): string[] {
  const parts: string[] = [];
  if (item.targetSets > 1) {
    parts.push(`${item.targetSets} series`);
  }
  if (item.repMin !== undefined && item.repMax !== undefined) {
    parts.push(item.repMin === item.repMax ? `${item.repMin} reps` : `${item.repMin}-${item.repMax} reps`);
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
  return parts.length ? parts : ["execucao simples"];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  return `${Math.round(seconds / 60)} min`;
}

function formatDurationClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getItemName(item: Exercise): string {
  return item.displayName ?? item.name;
}

function getItemCategory(item: Exercise, block?: PrescribedBlock): string {
  const blockCategory = getBlockCategory(block);
  if (blockCategory) {
    return blockCategory;
  }
  const raw = item.kind ?? item.type;
  return raw.replaceAll("_", " ");
}

function getBlockCategory(block?: PrescribedBlock): string | undefined {
  if (!block) {
    return undefined;
  }
  if (block.type === "warmup") {
    return "aquecimento";
  }
  if (block.type === "mobility") {
    return "mobilidade";
  }
  if (block.type === "base_body") {
    return "base corporal";
  }
  if (block.type === "cooldown") {
    return "alongamento";
  }
  if (block.type === "review") {
    return "revisao";
  }
  if (block.type === "rounds") {
    return "round";
  }
  if (block.type === "test") {
    return "teste";
  }
  return undefined;
}

function getDefaultItemMessage(item: Exercise): string {
  if (item.kind === "rounds" || item.type === "rounds") {
    return "Execute o round com controle e marque feito ao terminar.";
  }
  if (item.kind === "mobility" || item.type === "mobility") {
    return "Movimento simples para preparar o corpo. Faca com calma e marque feito.";
  }
  if (item.kind === "base_body" || item.type === "base_body" || item.kind === "core") {
    return "Base corporal: controle, postura e respiracao antes de intensidade.";
  }
  if (item.kind === "dance_external") {
    return "Abra a aula externa, registre o essencial e siga para o proximo card.";
  }
  if (item.kind === "capoeira_movement") {
    return "Foque em qualidade, fluidez e lados. Sem pressa para dominar.";
  }
  return "Execute o item planejado e marque feito para seguir.";
}

type NumberFieldProps = {
  label: string;
  value?: number;
  suffix: string;
  min?: number;
  max?: number;
  onChange: (value: number | undefined) => void;
};

function NumberField({ label, value, suffix, min, max, onChange }: NumberFieldProps) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <div className="mt-1 flex overflow-hidden rounded-md border border-slate-700 bg-slate-950">
        <input
          className="w-full bg-transparent px-3 py-3 text-lg font-black text-white"
          inputMode="decimal"
          max={max}
          min={min}
          onChange={(event) => {
            if (event.target.value === "") {
              onChange(undefined);
              return;
            }
            const parsed = Number(event.target.value);
            const clampedMin = min === undefined ? parsed : Math.max(min, parsed);
            const clamped = max === undefined ? clampedMin : Math.min(max, clampedMin);
            onChange(clamped);
          }}
          type="number"
          value={value ?? ""}
        />
        {suffix ? (
          <span className="inline-flex items-center gap-1 px-3 py-2 text-slate-500">
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

type CheckboxFieldProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function CheckboxField({ label, value, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold text-slate-200">
      <input
        checked={value}
        className="h-5 w-5 accent-teal-400"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
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
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-lg font-black text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
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
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-base font-bold text-white outline-none"
        onChange={(event) => onChange(event.target.value)}
        type="text"
        value={value}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: TextFieldProps) {
  return (
    <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <textarea
        className="mt-1 min-h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-base font-bold text-white outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
