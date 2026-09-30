import test from "node:test";
import assert from "node:assert/strict";
import { listingPrice, selectedPrice, validateSelection, isAvailable } from "../src/lib/commerce";
test("base and sale prices agree", () => {
 assert.deepEqual(listingPrice({price:100,salePrice:80}),{available:true,min:80,max:80,from:false});
});
test("unavailable cheap variants never set listing price", () => {
 const product={price:10,variants:[{id:1,type:"size",price:20,outOfStock:true},{id:2,type:"size",price:70}]};
 assert.equal(listingPrice(product).min,70);
});
test("every required option group needs an available choice", () => {
 assert.equal(isAvailable({price:100,variants:[{type:"color",outOfStock:true},{type:"size",price:100}]}),false);
 assert.equal(listingPrice({price:100,outOfStock:true}).min,0);
});
test("mixed priced selections use the existing sum rule", () => {
 const p={price:999,variants:[{id:1,type:"color",price:20},{id:2,type:"size",price:100}]};
 assert.equal(listingPrice(p).min,120);
 assert.equal(selectedPrice(p,validateSelection(p,[1,2])),120);
});
test("invalid, repeated, incomplete and sold-out selections are rejected", () => {
 const p={price:100,variants:[{id:1,type:"color"},{id:2,type:"size",price:30},{id:3,type:"size",price:20,outOfStock:true}]};
 for (const ids of [[],[1],[1,999],[1,2,2],[1,3]]) assert.throws(()=>validateSelection(p,ids));
 assert.equal(selectedPrice(p,validateSelection(p,[1,2])),30);
 assert.throws(()=>validateSelection({price:0},[]));
});
test("listing bounds match all actual combinations, including optional explicit prices", () => {
 for(let seed=0;seed<32;seed++){
 const variants=[{id:1,type:"a",price:seed%2?null:10},{id:2,type:"a",price:30,outOfStock:!!(seed&2)},
 {id:3,type:"b",price:seed&4?null:20},{id:4,type:"b",salePrice:40,price:50,outOfStock:!!(seed&8)}];
 const p={price:seed&16?60:100,variants};
 const prices=variants.filter(v=>v.type==="a"&&!v.outOfStock).flatMap(a=>variants.filter(v=>v.type==="b"&&!v.outOfStock).map(b=>selectedPrice(p,[a,b])));
 const actual=listingPrice(p);assert.equal(actual.min,Math.min(...prices));assert.equal(actual.max,Math.max(...prices));
 }
});
