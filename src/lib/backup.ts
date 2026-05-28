import type { AppData, BackupSummary } from "../types/appData";

export type BackupEnvelope = {
  app: "gigante-agil";
  exportedAt: string;
  data: AppData;
};

export function createBackup(data: AppData, now = new Date()): BackupEnvelope {
  return {
    app: "gigante-agil",
    exportedAt: now.toISOString(),
    data,
  };
}

export function getBackupFilename(date = new Date()): string {
  return `gigante-agil-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function serializeBackup(data: AppData, now = new Date()): string {
  return JSON.stringify(createBackup(data, now), null, 2);
}

export function parseBackup(raw: string): BackupEnvelope {
  const parsed = JSON.parse(raw) as BackupEnvelope;
  if (parsed.app !== "gigante-agil" || !parsed.data || parsed.data.version !== 1) {
    throw new Error("Backup inválido ou versão não suportada.");
  }

  if (!Array.isArray(parsed.data.sessions) || !Array.isArray(parsed.data.rewards)) {
    throw new Error("Backup incompleto.");
  }

  return parsed;
}

export function summarizeBackup(envelope: BackupEnvelope): BackupSummary {
  return {
    version: envelope.data.version,
    sessions: envelope.data.sessions.length,
    checkins: envelope.data.bodyCheckins.length,
    rewards: envelope.data.rewards.length,
    exportedAt: envelope.exportedAt,
  };
}
