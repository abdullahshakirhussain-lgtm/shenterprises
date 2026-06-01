"use client";
import { useRouter } from "next/navigation";

export default function DeleteButton({ id }: { id: number }) {
  const router = useRouter();
  async function del() {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("Delete failed");
  }
  return <button onClick={del} className="text-red-600 text-sm hover:underline">Delete</button>;
}
