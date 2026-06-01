export function clampQueueIndex(length: number, index: number): number {
  if (length <= 0) {
    return -1;
  }
  return Math.min(Math.max(index, 0), length - 1);
}

export function findFirstPendingIndex<T>(
  items: T[],
  isCompleted: (item: T) => boolean,
): number {
  return items.findIndex((item) => !isCompleted(item));
}

export function findNextPendingIndex<T>(
  items: T[],
  currentIndex: number,
  isCompleted: (item: T) => boolean,
  wrap = true,
): number {
  if (!items.length) {
    return -1;
  }

  const safeIndex = clampQueueIndex(items.length, currentIndex);
  for (let index = safeIndex + 1; index < items.length; index += 1) {
    if (!isCompleted(items[index])) {
      return index;
    }
  }

  if (!wrap) {
    return -1;
  }

  for (let index = 0; index <= safeIndex; index += 1) {
    if (!isCompleted(items[index])) {
      return index;
    }
  }

  return -1;
}

export function findPreviousPendingIndex<T>(
  items: T[],
  currentIndex: number,
  isCompleted: (item: T) => boolean,
): number {
  if (!items.length) {
    return -1;
  }

  const safeIndex = clampQueueIndex(items.length, currentIndex);
  for (let index = safeIndex - 1; index >= 0; index -= 1) {
    if (!isCompleted(items[index])) {
      return index;
    }
  }

  for (let index = items.length - 1; index >= safeIndex; index -= 1) {
    if (!isCompleted(items[index])) {
      return index;
    }
  }

  return -1;
}
