import { describe, expect, it } from "vitest";
import { createInitialAppData } from "../data/createInitialAppData";
import { ECONOMY_VERSION } from "./gamification";
import { normalizeAppDataForEconomy } from "./economyMigration";

describe("economy migration", () => {
  it("recalcula XP e moedas sem apagar cargas e series", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    data.settings.economyVersion = 1;
    data.sessions = [
      {
        id: "s1",
        date: "2026-05-25T10:00:00.000Z",
        workoutId: "treino-a",
        workoutName: "Treino A",
        status: "partial",
        earnedXp: 300,
        earnedCoins: 300,
        exercises: [
          {
            exerciseId: "leg-press-45",
            exerciseName: "Leg Press 45º",
            type: "strength",
            completed: true,
            pain: false,
            dizziness: false,
            sets: [
              { setIndex: 1, setKind: "warmup", weightKg: 50, reps: 12, completed: true },
              { setIndex: 2, setKind: "work", weightKg: 100, reps: 8, completed: true },
              { setIndex: 3, setKind: "work", weightKg: 100, reps: 8, completed: true },
              { setIndex: 4, setKind: "work", weightKg: 100, reps: 8, completed: true },
            ],
          },
        ],
      },
    ];
    data.rewards[0] = {
      ...data.rewards[0],
      costXp: 1000,
      claimed: true,
      claimedAt: "2026-05-25T12:00:00.000Z",
    };

    const normalized = normalizeAppDataForEconomy(data);

    expect(normalized.changed).toBe(true);
    expect(normalized.data.settings.economyVersion).toBe(ECONOMY_VERSION);
    expect(normalized.data.sessions[0].earnedXp).toBe(5);
    expect(normalized.data.sessions[0].earnedCoins).toBe(0);
    expect(normalized.data.sessions[0].exercises[0].sets[3]).toMatchObject({
      weightKg: 100,
      reps: 8,
    });
    expect(normalized.data.rewards[0]).toMatchObject({
      costXp: 300,
      claimed: false,
    });
  });
});
