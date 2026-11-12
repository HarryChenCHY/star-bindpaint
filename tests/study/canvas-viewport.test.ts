import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewportGesture, viewportPoint } from '../../src/lib/canvas-viewport';
test('pinch preserves the content point under the moving finger midpoint',()=>{
 const view={x:20,y:10,scale:2}, start={x:100,y:90}, end={x:120,y:110};
 const next=viewportGesture(view,start,end,1.5);
 assert.equal((start.x-view.x)/view.scale,(end.x-next.x)/next.scale);
 assert.equal((start.y-view.y)/view.scale,(end.y-next.y)/next.scale);
});
test('pan does not change scale and pinch clamps within useful view bounds',()=>{
 assert.deepEqual(viewportGesture({x:0,y:0,scale:1},{x:10,y:10},{x:30,y:40},1),{x:20,y:30,scale:1});
 assert.equal(viewportGesture({x:0,y:0,scale:1},{x:0,y:0},{x:0,y:0},100).scale,4);
 assert.equal(viewportGesture({x:0,y:0,scale:2},{x:0,y:0},{x:0,y:0},.01).scale,1);
});
test('a full-screen stage keeps pinch anchored to the offset fitted paper center',()=>{
 const fitted={left:62,top:115,width:320,height:557};
 assert.deepEqual(viewportPoint(fitted,{x:222,y:393.5}),{x:0,y:0});
 const view={x:25,y:-10,scale:1.5}, startScreen={x:270,y:455}, endScreen={x:300,y:490};
 const start=viewportPoint(fitted,startScreen), end=viewportPoint(fitted,endScreen);
 const content={x:(start.x-view.x)/view.scale,y:(start.y-view.y)/view.scale};
 const next=viewportGesture(view,start,end,1.2);
 assert.ok(Math.abs(222+next.x+content.x*next.scale-endScreen.x)<1e-8);
 assert.ok(Math.abs(393.5+next.y+content.y*next.scale-endScreen.y)<1e-8);
});
