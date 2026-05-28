import { describe, expect, it } from "vitest";
import { createInitialAppData } from "../data/createInitialAppData";
import {
  getBackupFilename,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from "./backup";

describe("backup", () => {
  it("exporta e importa backup válido", () => {
    const data = createInitialAppData(new Date("2026-05-27T10:00:00.000Z"));
    const raw = serializeBackup(data, new Date("2026-05-27T11:00:00.000Z"));
    const parsed = parseBackup(raw);

    expect(parsed.app).toBe("gigante-agil");
    expect(summarizeBackup(parsed)).toMatchObject({
      version: 1,
      sessions: 0,
      rewards: data.rewards.length,
    });
  });

  it("gera nome de arquivo por data", () => {
    expect(getBackupFilename(new Date("2026-05-27T11:00:00.000Z"))).toBe(
      "gigante-agil-backup-2026-05-27.json",
    );
  });

  it("rejeita backup inválido", () => {
    expect(() => parseBackup("{}")).toThrow("Backup inválido");
  });
});
