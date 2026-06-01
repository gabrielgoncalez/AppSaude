import { describe, expect, it } from "vitest";
import {
  findFirstPendingIndex,
  findNextPendingIndex,
  findPreviousPendingIndex,
} from "./dailyQueueNavigation";

describe("dailyQueueNavigation", () => {
  const items = ["leg", "supino", "puxada", "flexora"];

  it("avanca sem marcar o item atual como concluido", () => {
    const completed = new Set<string>();
    expect(findNextPendingIndex(items, 0, (item) => completed.has(item), false)).toBe(1);
    expect(findFirstPendingIndex(items, (item) => completed.has(item))).toBe(0);
  });

  it("volta para pendente anterior", () => {
    const completed = new Set(["supino"]);
    expect(findPreviousPendingIndex(items, 2, (item) => completed.has(item))).toBe(0);
  });

  it("pula item da frente que ja foi feito ao avancar depois", () => {
    const completed = new Set(["supino"]);
    expect(findNextPendingIndex(items, 0, (item) => completed.has(item))).toBe(2);
  });
});
