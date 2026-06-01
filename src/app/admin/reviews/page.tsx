import { prisma } from "@/lib/prisma";
import ReviewModerator from "./Moderator";

export const dynamic = "force-dynamic";

export default async function AdminReviews() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, slug: true } } }
  });
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-4">Reviews</h1>
      <ReviewModerator initial={reviews.map((r) => ({
        id: r.id, name: r.name, rating: r.rating, title: r.title, body: r.body, approved: r.approved,
        createdAt: r.createdAt.toISOString(), productName: r.product.name, productSlug: r.product.slug
      }))} />
    </div>
  );
}
