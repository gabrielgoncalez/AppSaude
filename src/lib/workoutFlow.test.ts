import { describe, expect, it } from "vitest";
import { getSetActionLabel, isFinalExerciseSet } from "./workoutFlow";

describe("workoutFlow", () => {
  it("mantém o botão como finalizar série antes da meta", () => {
    expect(isFinalExerciseSet(3, 4)).toBe(false);
    expect(getSetActionLabel(3, 4)).toBe("Finalizar série");
  });

  it("troca para finalizar exercício na última série cadastrada", () => {
    expect(isFinalExerciseSet(4, 4)).toBe(true);
    expect(getSetActionLabel(4, 4)).toBe("Finalizar exercício");
  });

  it("mantém finalizar exercício quando dados antigos passam da meta", () => {
    expect(isFinalExerciseSet(5, 4)).toBe(true);
    expect(getSetActionLabel(5, 4)).toBe("Finalizar exercício");
  });
});
