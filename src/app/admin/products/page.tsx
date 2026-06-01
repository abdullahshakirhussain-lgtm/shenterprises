import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import Link from "next/link";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminProducts({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || "").trim();
  const products = await prisma.product.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : undefined,
    include: { category: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="container-x py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-brand-900">Products ({products.length})</h1>
        <div className="flex gap-2">
          <Link href="/admin/import" className="btn-secondary">Import CSV</Link>
          <Link href="/admin/products/new" className="btn-primary">+ New product</Link>
        </div>
      </div>
      <form className="mb-3"><input name="q" defaultValue={q} placeholder="Search…" className="input max-w-sm" /></form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50">
            <tr className="text-left">
              <th className="p-2">Name</th><th className="p-2">Category</th><th className="p-2">SKU</th>
              <th className="p-2">Price</th><th className="p-2">Stock</th><th className="p-2">Status</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-brand-100">
                <td className="p-2"><Link href={`/admin/products/${p.id}/edit`} className="text-brand-700 underline">{p.name}</Link></td>
                <td className="p-2">{p.category?.name || "—"}</td>
                <td className="p-2">{p.sku || "—"}</td>
                <td className="p-2">{p.salePrice ? <><span className="line-through text-brand-400 mr-1">{formatLKR(p.price)}</span>{formatLKR(p.salePrice)}</> : formatLKR(p.price)}</td>
                <td className="p-2">{p.stock}</td>
                <td className="p-2">{p.active ? "Active" : "Hidden"} {p.onOffer && "· Offer"} {p.featured && "· Featured"}</td>
                <td className="p-2 text-right"><DeleteButton id={p.id} /></td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-brand-600">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
