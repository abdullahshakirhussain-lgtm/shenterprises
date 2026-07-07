import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import Link from "next/link";
import MachineDeleteButton from "./MachineDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminMachines() {
  const machines = await prisma.machine.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="container-x py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-brand-900">Machines ({machines.length})</h1>
        <div className="flex gap-2">
          <Link href="/admin/machines/bulk" className="btn-secondary">⚡ Bulk from photos</Link>
          <Link href="/admin/machines/new" className="btn-primary">+ Add machine</Link>
        </div>
      </div>

      {machines.length === 0 ? (
        <p className="text-brand-600">No machines yet. Click “Add machine” to create your first Prime machine.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-600 border-b border-brand-100">
                <th className="p-2">Image</th><th className="p-2">Model</th><th className="p-2">Name</th>
                <th className="p-2">Price</th><th className="p-2">Status</th><th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.map(m => (
                <tr key={m.id} className="border-b border-brand-100">
                  <td className="p-2">
                    <div className="w-12 h-12 rounded bg-brand-50 overflow-hidden">
                      {m.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full grid place-items-center text-lg">🧵</div>}
                    </div>
                  </td>
                  <td className="p-2 font-mono text-xs">{m.brand} {m.modelNumber}</td>
                  <td className="p-2">{m.name}</td>
                  <td className="p-2">{m.price != null ? formatLKR(m.price) : <span className="text-brand-500 italic">Enquire</span>}</td>
                  <td className="p-2 text-xs">{m.active ? "Active" : "Hidden"}</td>
                  <td className="p-2 text-right">
                    <div className="flex gap-1 justify-end items-center">
                      <Link href={`/machines/${m.slug}`} target="_blank" className="px-2.5 py-1 rounded bg-brand-100 text-brand-700 text-xs hover:bg-brand-200">View</Link>
                      <Link href={`/admin/machines/${m.id}/edit`} className="px-2.5 py-1 rounded bg-brand-600 text-white text-xs hover:bg-brand-700">Edit</Link>
                      <MachineDeleteButton id={m.id} name={`${m.brand} ${m.modelNumber}`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
