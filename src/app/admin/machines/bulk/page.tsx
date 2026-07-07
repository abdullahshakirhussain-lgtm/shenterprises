import Link from "next/link";
import BulkMachineUpload from "./BulkMachineUpload";

export const dynamic = "force-dynamic";

export default function BulkMachinesPage() {
  return (
    <div className="container-x py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-brand-900">Bulk upload machines from photos</h1>
        <Link href="/admin/machines" className="text-sm text-brand-700 underline">← All machines</Link>
      </div>
      <BulkMachineUpload />
    </div>
  );
}
