import { prisma } from "@/lib/prisma";
import CategoriesEditor from "./Editor";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const cats = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } }
  });
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-4">Categories</h1>
      <CategoriesEditor initial={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sortOrder, count: c._count.products }))} />
    </div>
  );
}
