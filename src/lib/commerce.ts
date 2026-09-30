export type PricedVariant = { id?: number; type: string; name?: string; price?: number | null; salePrice?: number | null; outOfStock?: boolean };
export type PricedProduct = { price: number; salePrice?: number | null; outOfStock?: boolean; variants?: PricedVariant[] };
export function effectivePrice(p: { price?: number | null; salePrice?: number | null }): number | null { return p.salePrice ?? p.price ?? null; }
export function isAvailable(p: PricedProduct): boolean {
 if (p.outOfStock) return false;
 const groups = new Map<string, PricedVariant[]>();
 for (const v of p.variants || []) groups.set(v.type, [...(groups.get(v.type) || []), v]);
 return [...groups.values()].every(group => group.some(v => !v.outOfStock));
}
export function selectedPrice(p: PricedProduct, selected: PricedVariant[]): number {
 const priced = selected.map(effectivePrice).filter((v): v is number => v !== null);
 return priced.length ? priced.reduce((a, b) => a + b, 0) : effectivePrice(p) || 0;
}
export function listingPrice(p: PricedProduct): { available: boolean; min: number; max: number; from: boolean } {
 if (!isAvailable(p)) return { available: false, min: 0, max: 0, from: false };
 const groups = new Map<string, PricedVariant[]>();
 for (const v of p.variants || []) if (!v.outOfStock) groups.set(v.type, [...(groups.get(v.type) || []), v]);
 let unpriced = true, low = Infinity, high = -Infinity;
 for (const group of groups.values()) {
 const amounts = group.map(effectivePrice).filter((v): v is number => v !== null);
 const canSkip = group.some(v => effectivePrice(v) === null);
 const nextLow = Math.min(canSkip ? low : Infinity, amounts.length ? Math.min(...amounts) + Math.min(unpriced ? 0 : Infinity, low) : Infinity);
 const nextHigh = Math.max(canSkip ? high : -Infinity, amounts.length ? Math.max(...amounts) + Math.max(unpriced ? 0 : -Infinity, high) : -Infinity);
 unpriced = unpriced && canSkip; low = nextLow; high = nextHigh;
 }
 if (unpriced) { low = Math.min(low, effectivePrice(p) || 0); high = Math.max(high, effectivePrice(p) || 0); }
 const min = Number.isFinite(low) ? low : 0, max = Number.isFinite(high) ? high : 0;
 return { available: true, min, max, from: max > min };
}
export function validateSelection(p: PricedProduct, ids: number[]): PricedVariant[] {
 if (!isAvailable(p)) throw new Error("This product is out of stock.");
 const variants = p.variants || [];
 if (new Set(ids).size !== ids.length) throw new Error("Please select each option once.");
 const selected = ids.map(id => {
 const v = variants.find(v => v.id === id);
 if (!v || v.outOfStock) throw new Error("A selected option is unavailable. Please review your cart.");
 return v;
 });
 const types = new Set(variants.map(v => v.type));
 if (selected.length !== types.size || [...types].some(type => selected.filter(v => v.type === type).length !== 1))
 throw new Error("Please select one option from every product option group.");
 if (!(selectedPrice(p, selected) > 0)) throw new Error("This product does not have a purchasable price. Please contact us.");
 return selected;
}
