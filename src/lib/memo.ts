// In-process cache for public catalog reads (products, categories, banners,
// machines, settings). The site runs as a single web process, so memory is
// shared by every visitor and a page render needs no Sydney round trips.
//
// Freshness:
//  - Any write to a catalog model (see CATALOG_MODELS in lib/prisma.ts) calls
//    invalidateCatalog(), so admin edits — price, out-of-stock, new product —
//    show on the very next request.
//  - Entries also refresh after TTL_MS as a safety net for writes made outside
//    this app. On TTL expiry the stale value is served while one background
//    refresh runs; after an invalidation callers always wait for fresh data.
//  - Values are structuredClone'd on the way out so callers can't mutate the
//    shared copy (Dates survive, unlike JSON-based caches).

const TTL_MS = 60_000;
const MAX_ENTRIES = 1000;

type Entry = { value: unknown; at: number; gen: number };

const g = globalThis as unknown as {
  __memo?: { gen: number; store: Map<string, Entry>; pending: Map<string, Promise<unknown>> };
};
const state = (g.__memo ??= { gen: 0, store: new Map(), pending: new Map() });

export function invalidateCatalog() {
  state.gen++;
}

function load<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const gen = state.gen;
  const flightKey = gen + ":" + key;
  const inflight = state.pending.get(flightKey);
  if (inflight) return inflight as Promise<T>;
  const p = loader()
    .then(value => {
      // Don't store a result that an invalidation raced past.
      if (gen === state.gen) {
        if (state.store.size >= MAX_ENTRIES) state.store.delete(state.store.keys().next().value!);
        state.store.set(key, { value, at: Date.now(), gen });
      }
      return value;
    })
    .finally(() => state.pending.delete(flightKey));
  state.pending.set(flightKey, p);
  return p;
}

export async function memo<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = state.store.get(key);
  if (hit && hit.gen === state.gen) {
    if (Date.now() - hit.at > TTL_MS) load(key, loader).catch(() => {}); // refresh in background
    return structuredClone(hit.value) as T;
  }
  try {
    return structuredClone(await load(key, loader));
  } catch (e) {
    // Database hiccup: an older copy beats an error page.
    if (hit) return structuredClone(hit.value) as T;
    throw e;
  }
}
