import { test } from 'node:test';
import assert from 'node:assert/strict';
import { objectPoint, reorderMaterial, maskedMaterialSource } from '../../src/lib/material-editing';
import type { MaterialInstance } from '../../src/lib/material-layout';
const item: MaterialInstance = { id: 'photo', material: { id:'photo',kind:'uploaded', label:'照片',src:'data:image/png;base64,AAAA',ratio:2,color:'#fff' }, x:320,y:240,width:200,height:100,rotation:90,variation:0,harmonize:false,src:'data:image/png;base64,AAAA' };
test('inverse rotated object coordinates locate the original image independently of viewport scale',()=>{
 assert.deepEqual(objectPoint(item,{x:320,y:240}),{x:500,y:250});
 const p=objectPoint(item,{x:320,y:340}); assert.ok(Math.abs(p.x-1000)<1e-8); assert.ok(Math.abs(p.y-250)<1e-8);
});
test('layer steps preserve ids, clamp endpoints and never mutate source order',()=>{
 const source=[{id:'a'},{id:'b'},{id:'c'}];
 assert.deepEqual(reorderMaterial(source,'a',1).map(i=>i.id),['b','a','c']);
 assert.deepEqual(reorderMaterial(source,'a',-1),source);
 assert.deepEqual(reorderMaterial(source,'missing',1),source);
 assert.deepEqual(source.map(i=>i.id),['a','b','c']);
});
test('mask restoration follows erasure and retains the unmodified original source',()=>{
 assert.equal(maskedMaterialSource(item),item.src);
 const masked={...item,mask:[{restore:false,size:80,points:[{x:500,y:250}]},{restore:true,size:40,points:[{x:500,y:250}]}]};
 const svg=decodeURIComponent(maskedMaterialSource(masked).split(',').slice(1).join(','));
 assert.ok(svg.includes('height="500"'));
 assert.ok(svg.indexOf('stroke="black"') < svg.indexOf('stroke="white"'));
 assert.ok(svg.includes('data:image/png;base64,AAAA')); assert.equal(item.mask,undefined);
});
