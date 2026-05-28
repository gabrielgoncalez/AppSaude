import { describe, expect, it } from "vitest";
import { daysUntilNextCheckin, isCheckinDue } from "./dates";

describe("dates", () => {
  it("vence check-in depois de 15 dias do início", () => {
    expect(
      isCheckinDue([], "2026-05-01T10:00:00.000Z", new Date("2026-05-16T10:00:00.000Z")),
    ).toBe(true);
  });

  it("calcula dias restantes desde último check-in", () => {
    expect(
      daysUntilNextCheckin(
        [
          {
            id: "c1",
            date: "2026-05-10T10:00:00.000Z",
            weightKg: 114,
            energy: 3,
            sleep: 3,
            hunger: 3,
            soreness: 3,
            jointPain: false,
            dizziness: false,
          },
        ],
        "2026-05-01T10:00:00.000Z",
        new Date("2026-05-20T10:00:00.000Z"),
      ),
    ).toBe(5);
  });
});
