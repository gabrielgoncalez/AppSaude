import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  PrescribedBlock,
  PrescribedItem,
  TodayPrescription,
} from "../../lib/prescriptionEngine";
import type { Exercise, TrainingSession, Workout } from "../../types/training";
import { DailyWorkoutRunner } from "./DailyWorkoutRunner";

const boxingWorkout: Workout = {
  id: "boxe",
  name: "Boxe Tecnico",
  dayOfWeek: 2,
  type: "skill",
  modality: "boxing",
};

const jabRound: Exercise = {
  id: "round-jab-distancia",
  name: "Round 1 - Jab e distancia",
  displayName: "Round 1 - Jab e distancia",
  type: "rounds",
  kind: "rounds",
  targetSets: 1,
  durationSec: 120,
  restSec: 90,
};

const item: PrescribedItem = {
  blockId: "boxe-rounds",
  blockName: "Rounds no Saco",
  exercise: jabRound,
  prescription: {} as PrescribedItem["prescription"],
};

const block: PrescribedBlock = {
  id: "boxe-rounds",
  name: "Rounds no Saco",
  type: "rounds",
  blockMode: "rounds",
  required: true,
  items: [item],
};

const prescription: TodayPrescription = {
  workoutId: boxingWorkout.id,
  workoutName: boxingWorkout.name,
  exercises: [],
  prescribedBlocks: [block],
  shortMessage: "",
};

const completedSession: TrainingSession = {
  id: "s1",
  date: "2026-06-02T10:00:00.000Z",
  workoutId: "boxe",
  workoutName: "Boxe Tecnico",
  status: "partial",
  exercises: [],
  completedItems: ["boxe-rounds:round-jab-distancia"],
  completedBlocks: ["boxe-rounds"],
  earnedXp: 0,
};

describe("DailyWorkoutRunner completion", () => {
  it("finaliza missao tecnica quando todos os cards ja foram feitos", () => {
    const onCompleteSkillWorkout = vi.fn();

    render(
      <DailyWorkoutRunner
        previousSets={new Map()}
        prescription={prescription}
        session={completedSession}
        sessions={[completedSession]}
        workout={boxingWorkout}
        onAddSet={vi.fn()}
        onCompleteChecklistItem={vi.fn()}
        onCompleteChecklistItemAndWorkout={vi.fn()}
        onCompleteSkillWorkout={onCompleteSkillWorkout}
        onCompleteWorkout={vi.fn()}
        onFinishExerciseSet={vi.fn()}
      />,
    );

    expect(screen.getByText("Tudo feito")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Salvar parcial" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Finalizar missao" }));

    expect(onCompleteSkillWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        completedItems: ["boxe-rounds:round-jab-distancia"],
        completedBlocks: ["boxe-rounds"],
      }),
    );
  });
});
