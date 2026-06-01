import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/ProductForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: { id: string } }) {
  const [p, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: parseInt(params.id) } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } })
  ]);
  if (!p) notFound();
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-4">Edit: {p.name}</h1>
      <ProductForm initial={p as any} categories={categories} />
    </div>
  );
}
