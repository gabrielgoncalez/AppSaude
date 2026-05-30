import { describe, expect, it } from "vitest";
import {
  getSetActionLabel,
  getEffectiveWarmupSets,
  getSetKindForIndex,
  getTotalDisplayedSets,
  getWarmupLoadRange,
  getWorkSetNumber,
  isFinalExerciseSet,
  isFinalWorkSet,
} from "./workoutFlow";

describe("workoutFlow", () => {
  it("mantem o botao como finalizar serie antes da meta", () => {
    expect(isFinalExerciseSet(3, 4)).toBe(false);
    expect(getSetActionLabel(3, 4)).toBe("Finalizar série");
  });

  it("troca para finalizar exercicio na ultima serie cadastrada", () => {
    expect(isFinalExerciseSet(4, 4)).toBe(true);
    expect(getSetActionLabel(4, 4)).toBe("Finalizar exercício");
  });

  it("mantem finalizar exercicio quando dados antigos passam da meta", () => {
    expect(isFinalExerciseSet(5, 4)).toBe(true);
    expect(getSetActionLabel(5, 4)).toBe("Finalizar exercício");
  });

  it("marca as primeiras series como aquecimento e as demais como trabalho", () => {
    expect(getTotalDisplayedSets(3, 1)).toBe(4);
    expect(getSetKindForIndex(1, 1)).toBe("warmup");
    expect(getSetKindForIndex(2, 1)).toBe("work");
    expect(getWorkSetNumber(1, 1)).toBe(0);
    expect(getWorkSetNumber(2, 1)).toBe(1);
  });

  it("so finaliza exercicio na ultima serie de trabalho", () => {
    expect(isFinalWorkSet(1, 3, 1)).toBe(false);
    expect(isFinalWorkSet(3, 3, 1)).toBe(false);
    expect(isFinalWorkSet(4, 3, 1)).toBe(true);
  });

  it("usa uma serie de aquecimento por padrao quando nao houver cadastro explicito", () => {
    expect(getEffectiveWarmupSets(undefined)).toBe(1);
    expect(getEffectiveWarmupSets(0)).toBe(0);
    expect(getEffectiveWarmupSets(2)).toBe(2);
  });

  it("sugere aquecimento entre 40 e 50 por cento da ultima carga", () => {
    expect(getWarmupLoadRange(100)).toEqual({ minKg: 40, maxKg: 50 });
    expect(getWarmupLoadRange(undefined)).toBeUndefined();
  });
});
