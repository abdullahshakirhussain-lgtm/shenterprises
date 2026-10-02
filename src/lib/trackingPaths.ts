export function isPrivatePath(path: string): boolean {
 return /^\/(admin|api|account|order|track|r)(\/|$)/.test(path) || path.startsWith("/checkout/success");
}
export function cleanTrackingPath(path: string): string {
 const url = new URL(path, "https://shenterprises.lk");
 for (const key of [...url.searchParams.keys()]) if (!["utm_source", "utm_medium", "utm_campaign"].includes(key)) url.searchParams.delete(key);
 return url.pathname + (url.search ? url.search : "");
}
