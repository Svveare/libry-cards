/** Pick one entry by relative weight (`kind` field). */
export function pickWeighted<T extends string>(
  entries: { kind: T; weight: number }[],
): T {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll < 0) return entry.kind;
  }
  return entries[0]!.kind;
}
