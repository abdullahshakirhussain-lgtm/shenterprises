import test from "node:test";
import assert from "node:assert/strict";
import { calculateCheckoutQuote } from "../src/lib/checkoutQuote";
import { checkoutSchema } from "../src/lib/checkoutSchema";
function db(product:any,coupon:any=null,orders=0){return {$executeRawUnsafe:async()=>0,product:{findMany:async()=>[product]},order:{count:async()=>orders},coupon:{findUnique:async()=>coupon}} as any;}
const product={id:1,name:"Thread",price:100,salePrice:null,variants:[]};
test("quote includes quantities, all configured discounts and delivery",async()=>{
 const quote=await calculateCheckoutQuote({items:[{productId:1,quantity:2}],districtName:"Colombo"},{id:1,discountRate:5},{new_customer_tiers:'[{"order":1,"percent":10}]'},db(product));
 assert.equal(quote.subtotal,200);assert.equal(quote.accountDiscount,10);assert.equal(quote.tierDiscount,20);assert.equal(quote.total,570);
});
test("no free delivery is introduced without an existing threshold",async()=>{
 assert.equal((await calculateCheckoutQuote({items:[{productId:1,quantity:100}],districtName:"Kandy"},null,{},db(product))).fee,500);
});
test("guest coupon limits are checked against the supplied phone",async()=>{
 const coupon={code:"ONCE",active:true,minSubtotal:0,perUserLimit:1,type:"fixed",value:10,usedCount:0};
 await assert.rejects(calculateCheckoutQuote({items:[{productId:1,quantity:1}],districtName:"Colombo",couponCode:"ONCE",phone:"0770000000"},null,{},db(product,coupon,1)));
});
test("phone validation rejects short, foreign-format and nonnumeric input",()=>{
 const base={fullName:"Test",phone:"0770000000",addressLine1:"Test",districtName:"Colombo",cityName:"Test",paymentMethod:"cod",items:[{productId:1,quantity:1}]};
 assert.ok(checkoutSchema.safeParse(base).success);
 for(const phone of ["770000000","94770000000","077-0000000","077000000a"])assert.equal(checkoutSchema.safeParse({...base,phone}).success,false);
 assert.equal(checkoutSchema.safeParse({...base,phone2:"077000000"}).success,false);
 assert.equal(checkoutSchema.safeParse({...base,districtName:"fake"}).success,false);
});
