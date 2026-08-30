export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function indexFromSeed(seed: string, length: number): number {
  if (length <= 0) throw new Error("Cannot pick from an empty collection");
  return hashString(seed) % length;
}
