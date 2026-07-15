import { prisma } from "@/lib/prisma";
import Link from "next/link";
import MachineLeadHandled from "./MachineLeadHandled";

export const dynamic = "force-dynamic";

/**
 * "Call me back" leads captured from machine pages. Newest first, unhandled on
 * top. The owner calls the number, then ticks it handled.
 */
export default async function AdminMachineLeads() {
  const leads = await prisma.machineLead.findMany({
    orderBy: [{ handled: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  const pending = leads.filter(l => !l.handled).length;

  return (
    <div className="container-x py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-brand-900">
          Machine leads {pending > 0 && <span className="text-base font-normal text-brand-600">· {pending} to call</span>}
        </h1>
        <Link href="/admin/machines" className="btn-secondary">← Machines</Link>
      </div>

      {leads.length === 0 ? (
        <p className="text-brand-600">No leads yet. They&apos;ll appear here the moment someone leaves their number on a machine page.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-600 border-b border-brand-100">
                <th className="p-2">When</th><th className="p-2">Name</th><th className="p-2">Phone</th>
                <th className="p-2">Machine</th><th className="p-2">Message</th><th className="p-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} className={`border-b border-brand-100 ${l.handled ? "opacity-55" : ""}`}>
                  <td className="p-2 whitespace-nowrap text-xs text-brand-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="p-2 font-medium">{l.name}</td>
                  <td className="p-2"><a href={`tel:${l.phone}`} className="text-brand-700 font-mono hover:underline">{l.phone}</a></td>
                  <td className="p-2 text-xs">{l.modelNumber || "—"}</td>
                  <td className="p-2 text-xs text-brand-600 max-w-[280px]">{l.message || "—"}</td>
                  <td className="p-2 text-right"><MachineLeadHandled id={l.id} handled={l.handled} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
