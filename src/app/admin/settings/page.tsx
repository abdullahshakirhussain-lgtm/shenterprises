import { getAllSettings } from "@/lib/settings";
import SettingsForm from "./Form";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const settings = await getAllSettings();
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-4">Settings</h1>
      <SettingsForm initial={settings} />
    </div>
  );
}
