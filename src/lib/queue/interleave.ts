/**
 * Orders due cards: most overdue first, then a greedy pass so consecutive items rarely share a
 * primary tag. Ties inside a due day break on a hash of the date so the order shuffles daily but
 * stays stable within a day. Pure, unit-tested.
 */
export interface Interleavable {
  id: string;
  /** Review-day key (YYYY-MM-DD) of the due instant; earlier days first. */
  dueDay: string;
  primaryTag: string | null;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function interleave<T extends Interleavable>(items: T[], dateKey: string): T[] {
  const sorted = [...items].sort((a, b) => {
    if (a.dueDay !== b.dueDay) return a.dueDay < b.dueDay ? -1 : 1;
    return hashString(dateKey + a.id) - hashString(dateKey + b.id);
  });
  const result: T[] = [];
  const remaining = sorted;
  let lastTag: string | null | undefined;
  while (remaining.length) {
    // Prefer the earliest-due item whose tag differs from the previous pick, but never let a
    // different-tag item jump ahead of something due on an earlier day.
    const earliestDay = remaining[0].dueDay;
    let pick = remaining.findIndex((r) => r.dueDay === earliestDay && r.primaryTag !== lastTag);
    if (pick === -1) pick = 0;
    const [item] = remaining.splice(pick, 1);
    result.push(item);
    lastTag = item.primaryTag;
  }
  return result;
}

/** The topic tag with the lowest sort order, or null. */
export function primaryTagOf(tags: { kind: string; name: string; sortOrder: number }[]): string | null {
  const topics = tags.filter((t) => t.kind === "topic").sort((a, b) => a.sortOrder - b.sortOrder);
  return topics[0]?.name ?? null;
}
