import MachineForm from "@/components/MachineForm";

export const dynamic = "force-dynamic";

export default function NewMachine() {
  return (
    <div className="container-x py-6 space-y-6">
      <h1 className="font-display text-2xl text-brand-900">Add machine</h1>
      <MachineForm />
    </div>
  );
}
