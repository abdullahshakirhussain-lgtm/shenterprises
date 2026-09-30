import { prisma } from "./prisma";
import { memo } from "./memo";

// All settings are read as one cached map; any Setting write invalidates it.
export async function getAllSettings(): Promise<Record<string, string>> {
  return memo("settings", async () => {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });
}

export async function getSetting(key: string): Promise<string | null> {
  return (await getAllSettings())[key] ?? null;
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const all = await getAllSettings();
  return Object.fromEntries(keys.filter((k) => k in all).map((k) => [k, all[k]]));
}

export async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}
