export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  // FNVのままでは似たseedの下位ビットが相関し、剰余で割ったときに偏る。
  // MurmurHash3のfmix32で上位ビットを下位へ混ぜてから返す。
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function indexFromSeed(seed: string, length: number): number {
  if (length <= 0) throw new Error("Cannot pick from an empty collection");
  return hashString(seed) % length;
}
