import { NextRequest, NextResponse } from "next/server";
import { contentId } from "@/lib/contentId";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateSelection, selectedPrice, isAvailable } from "@/lib/commerce";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { readJson } from "@/lib/requestBody";
const schema=z.object({catalog:z.boolean().optional(),items:z.array(z.object({key:z.string().max(200),productId:z.number().int().positive(),variantIds:z.array(z.number().int().positive()).max(10).optional()})).max(200)});
export async function POST(req:NextRequest){
 try{
 if(!rateLimit("cart-check:"+clientIp(req),90,60).ok)return NextResponse.json({error:"Please try again shortly."},{status:429});
 const body=schema.parse(await readJson(req));
 const products=await prisma.product.findMany({where:{id:{in:body.items.map(i=>i.productId)},active:true},include:{variants:true}});
 const items=body.items.map(item=>{
 const product=products.find(p=>p.id===item.productId);
 try{
 if(!product||!isAvailable(product))throw new Error("Out of stock");
 const ids=item.variantIds||[];
 const selected=body.catalog?ids.map(id=>{
 const v=product.variants.find(v=>v.id===id&&!v.outOfStock);
 if(!v)throw new Error("Out of stock");return v;
 }):validateSelection(product,ids);
 const price=selectedPrice(product,selected);
 if(!(price>0))throw new Error("Please review options");
 return {key:item.key,available:true,price,contentId:contentId(product),name:product.name,imageUrl:product.imageUrl};
 }catch(error:any){return {key:item.key,available:false,error:error.message};}
 });
 return NextResponse.json({items},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Unable to refresh cart."},{status:400});}
}
