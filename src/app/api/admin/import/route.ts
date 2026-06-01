import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCSV } from "@/lib/csv";
import { slugify } from "@/lib/utils";
import { extractWithDeepSeek } from "@/lib/deepseek";

function pickNumber(v: any): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const useAI = form.get("useAI") === "1";
    const customPrompt = (form.get("customPrompt") as string) || undefined;
    if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });

    const { rows } = parseCSV(await file.text());
    const categories = await prisma.category.findMany();
    const catBySlug = new Map(categories.map((c) => [c.slug, c]));
    const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

    const errors: string[] = [];
    let imported = 0, skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        let data: any;
        if (useAI) {
          const extracted = await extractWithDeepSeek(row, customPrompt);
          if (!extracted) { skipped++; errors.push(`Row ${i + 2}: AI extraction failed`); continue; }
          data = extracted;
        } else {
          data = {
            name: row.name || row.Name || row.title || row.Title,
            description: row.description || row.Description,
            price: pickNumber(row.price ?? row.Price),
            salePrice: pickNumber(row.sale_price ?? row.salePrice),
            sku: row.sku || row.SKU || null,
            stock: pickNumber(row.stock ?? row.Stock) ?? 0,
            category: row.category || row.Category
          };
        }

        if (!data.name || data.price == null) { skipped++; errors.push(`Row ${i + 2}: missing name or price`); continue; }

        let categoryId: number | null = null;
        if (data.category) {
          const key = String(data.category).trim();
          const cat = catBySlug.get(slugify(key)) || catByName.get(key.toLowerCase());
          if (cat) categoryId = cat.id;
          else {
            const newCat = await prisma.category.create({ data: { name: key, slug: await uniqueCatSlug(slugify(key)) } });
            catBySlug.set(newCat.slug, newCat); catByName.set(newCat.name.toLowerCase(), newCat);
            categoryId = newCat.id;
          }
        }

        const slug = await uniqueProductSlug(slugify(data.name));
        await prisma.product.create({
          data: {
            name: String(data.name),
            slug,
            description: data.description ? String(data.description) : null,
            price: Number(data.price),
            salePrice: data.salePrice != null ? Number(data.salePrice) : null,
            sku: data.sku ? String(data.sku) : null,
            stock: Number(data.stock) || 0,
            categoryId,
            active: true
          }
        });
        imported++;
      } catch (e: any) {
        skipped++; errors.push(`Row ${i + 2}: ${e.message}`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function uniqueProductSlug(base: string) {
  let s = base || "product"; let i = 1;
  while (await prisma.product.findUnique({ where: { slug: s } })) s = `${base}-${++i}`;
  return s;
}
async function uniqueCatSlug(base: string) {
  let s = base || "category"; let i = 1;
  while (await prisma.category.findUnique({ where: { slug: s } })) s = `${base}-${++i}`;
  return s;
}
