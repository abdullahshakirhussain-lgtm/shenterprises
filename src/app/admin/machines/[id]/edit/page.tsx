import { prisma } from "@/lib/prisma";
import MachineForm from "@/components/MachineForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditMachine(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const m = await prisma.machine.findUnique({ where: { id: parseInt(params.id) } });
  if (!m) notFound();
  return (
    <div className="container-x py-6 space-y-6">
      <h1 className="font-display text-2xl text-brand-900">Edit: {m.brand} {m.modelNumber}</h1>
      <MachineForm initial={m as any} />
    </div>
  );
}
