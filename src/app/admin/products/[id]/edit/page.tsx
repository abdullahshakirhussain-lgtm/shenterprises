import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/ProductForm";
import VariantsPanel from "@/components/VariantsPanel";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const [p, categories, variants] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.productVariant.findMany({ where: { productId: id }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }] })
  ]);
  if (!p) notFound();
  return (
    <div className="container-x py-6 space-y-6">
      <h1 className="font-display text-2xl text-brand-900">Edit: {p.name}</h1>
      <ProductForm initial={p as any} categories={categories} />
      <VariantsPanel productId={id} productName={p.name} initialVariants={variants} imageUrl={p.imageUrl} />
    </div>
  );
}
