import { prisma } from "./prisma";
import { isAvailable } from "./commerce";
import { memo } from "./memo";
// Cached per search/cursor (see lib/memo.ts).
export function catalogPage(search = "", cursor?: number) {
 return memo("catalog:" + JSON.stringify([search, cursor ?? null]), () => loadCatalogPage(search, cursor));
}
async function loadCatalogPage(search: string, cursor?: number) {
 const pageSize = 48;
 const rows = await prisma.product.findMany({
 where: { active: true, outOfStock: false, ...(search ? { name: { contains: search.slice(0,100), mode: "insensitive" as const } } : {}),
 AND: ["color","size","length","pack"].map(type => ({ OR: [{variants:{none:{type}}},{variants:{some:{type,outOfStock:false}}}] })) },
 orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }, { id: "asc" }],
 ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), take: pageSize + 1,
 select: { id:true,sku:true,name:true,slug:true,price:true,salePrice:true,imageUrl:true,stock:true,unitQty:true,unitType:true,
 category:{select:{name:true,slug:true}},variants:{select:{id:true,type:true,name:true,price:true,salePrice:true,outOfStock:true},orderBy:{sortOrder:"asc"}} }
 });
 const page = rows.slice(0,pageSize);
 const groups = new Map<string,{name:string;slug:string;items:typeof page}>();
 for(const p of page.filter(isAvailable)){
 const slug=p.category?.slug||"other";
 if(!groups.has(slug))groups.set(slug,{slug,name:p.category?.name||"Other",items:[]});
 // Pack/size always get their own rows. Colour/length are normally agreed in the
 // WhatsApp chat — but when any option in that group has its own price, the
 // whole group is listed too, so the catalog never quotes the wrong amount.
 const priced=new Set(p.variants.filter(v=>!v.outOfStock&&(v.price!=null||v.salePrice!=null)).map(v=>v.type));
 groups.get(slug)!.items.push({...p,variants:p.variants.filter(v=>!v.outOfStock&&(["pack","size"].includes(v.type)||priced.has(v.type)))});
 }
 return {groups:[...groups.values()],nextCursor:rows.length>pageSize?page[page.length-1].id:null};
}
