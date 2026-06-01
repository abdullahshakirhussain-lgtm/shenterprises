"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { id: number; name: string; slug: string; sortOrder: number; count: number };

export default function CategoriesEditor({ initial }: { initial: Cat[] }) {
  const [cats, setCats] = useState(initial);
  const [name, setName] = useState("");
  const router = useRouter();

  async function add() {
    if (!name.trim()) return;
    const res = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) { setName(""); router.refresh(); }
  }
  async function del(id: number) {
    if (!confirm("Delete category? Products will become uncategorized.")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (res.ok) { setCats(cats.filter((c) => c.id !== id)); }
  }
  async function rename(id: number, newName: string) {
    await fetch(`/api/admin/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) });
  }

  return (
    <div className="card p-5 max-w-2xl">
      <div className="flex gap-2 mb-4">
        <input className="input flex-1" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={add} className="btn-primary">Add</button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-brand-600"><th>Name</th><th>Slug</th><th>Products</th><th></th></tr></thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id} className="border-t border-brand-100">
              <td className="py-2"><input defaultValue={c.name} onBlur={(e) => rename(c.id, e.target.value)} className="input" /></td>
              <td>{c.slug}</td>
              <td>{c.count}</td>
              <td><button onClick={() => del(c.id)} className="text-red-600 text-sm">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
