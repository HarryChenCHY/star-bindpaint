import { createCanvas, loadImage } from '/Users/harrychen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { planExpressivePainting, drawExpressiveStroke } from '/Users/harrychen/Desktop/startrace/src/lib/expressive-painter';
import { creativeMaterialSvg, surroundingColor } from '/Users/harrychen/Desktop/startrace/src/lib/creative-material';
const root='/Users/harrychen/Desktop/startrace';
const out='/Users/harrychen/Documents/ChatGPT/毕业论文/融合效果实验';
const W=640,H=480;
const settings={abstraction:60,mood:'original' as const};
const files=['src/lib/expressive-painter.ts','src/lib/creative-material.ts','src/components/creation/CoCreationStudio.tsx','src/workers/co-create.worker.ts'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(root+'/'+f)).digest('hex')]));
const before=hashes();
const make=()=>createCanvas(W,H);
const source=(c:any)=>({width:W,height:H,data:c.getContext('2d').getImageData(0,0,W,H).data});
const copy=(c:any)=>{const n=make();n.getContext('2d').drawImage(c,0,0);return n;};
async function paint(target:any,initial:any,priority?:any){const c=copy(initial);const strokes=await planExpressivePainting(source(target),source(initial),settings,{budget:2000,priority});for(const s of strokes)drawExpressiveStroke(c.getContext('2d') as any,s);return {canvas:c,count:strokes.length};}
function fused(photo:any,material:any,strength:number){
 const result=copy(photo),ctx=result.getContext('2d');
 if(!strength){ctx.drawImage(material,0,0);return result;}
 const halo=make(),hc=halo.getContext('2d');hc.filter='blur(16px)';hc.drawImage(material,0,0);
 const b=source(photo).data,m=source(material).data,h=source(halo).data,d=ctx.getImageData(0,0,W,H);
 const alpha=(x:number,y:number)=>m[(Math.max(0,Math.min(H-1,y))*W+Math.max(0,Math.min(W-1,x)))*4+3]/255;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*4,a=m[i+3]/255;
  // Color echo is limited to the surrounding halo, never a global filter.
  const echo=Math.min(.20,h[i+3]/255*.32*strength)*(1-a);
  const edge=1-Math.min(alpha(x-4,y),alpha(x+4,y),alpha(x,y-4),alpha(x,y+4));
  const breakup=(.5+.5*Math.sin(x*.41+y*.18)*Math.cos(y*.33-x*.08));
  const coverage=a*(1-edge*breakup*.48*strength);
  const luminance=(b[i]*.299+b[i+1]*.587+b[i+2]*.114)/255;
  for(let k=0;k<3;k++){
   const background=b[i+k]*(1-echo)+h[i+k]*echo;
   const local=m[i+k]*(1-.14*strength)+b[i+k]*.14*strength;
   const pigment=Math.max(0,Math.min(255,local+(luminance-.5)*14*strength));
   d.data[i+k]=background*(1-coverage)+pigment*coverage;
  }
 }
 ctx.putImageData(d,0,0);return result;
}
async function main(){
const cases=[{name:'花朵与花田',file:'public/masterworks/monet/poppy_field.jpg',id:'flower',label:'花朵',x:410,y:330,width:160,height:160,ratio:1},{name:'太阳与晨景',file:'public/masterworks/monet/impression_sunrise.jpg',id:'sun',label:'太阳',x:440,y:150,width:130,height:130,ratio:1}];
const rows:any[]=[],report:any[]=[];
for(let n=0;n<cases.length;n++){
 const c=cases[n],photo=make(),pc=photo.getContext('2d'),img=await loadImage(root+'/'+c.file);
 pc.fillStyle='white';pc.fillRect(0,0,W,H);const scale=Math.min(W/img.width,H/img.height);pc.drawImage(img,(W-img.width*scale)/2,(H-img.height*scale)/2,img.width*scale,img.height*scale);
 const blank=make();blank.getContext('2d').fillStyle='white';blank.getContext('2d').fillRect(0,0,W,H);
 console.log(c.name+': initial paint');const initial=await paint(photo,blank);
 const placement={...c,material:{id:c.id,label:c.label,ratio:c.ratio}};
 const ambient=surroundingColor(source(photo),placement as any);
 const svg=creativeMaterialSvg(c.id as any,0,ambient);
 const material=make();material.getContext('2d').drawImage(await loadImage(Buffer.from(svg)),c.x-c.width/2,c.y-c.height/2,c.width,c.height);
 const results=[];
 for(const strength of [0,1,1.6]){
  const target=fused(photo,material,strength);
  const pad=strength?48:12;
  const priority={x:Math.max(0,c.x-c.width/2-pad),y:Math.max(0,c.y-c.height/2-pad),width:Math.min(W,c.width+pad*2),height:Math.min(H,c.height+pad*2)};
  console.log(c.name+': strength '+strength);
  const r=await paint(target,initial.canvas,priority);
  const tag=strength===0?'current':strength===1?'fused':'strong';
  writeFileSync(`${out}/case-${n+1}-${tag}.png`,r.canvas.toBuffer('image/png'));
  writeFileSync(`${out}/case-${n+1}-${tag}-target.png`,target.toBuffer('image/png'));
  results.push(r.canvas);report.push({case:c.name,source:c.file,strength,initialStrokes:initial.count,continuationStrokes:r.count,priority});
 }
 writeFileSync(`${out}/case-${n+1}-initial.png`,initial.canvas.toBuffer('image/png'));
 rows.push({case:c,results});
}
const sheet=createCanvas(1960,1170),sc=sheet.getContext('2d');sc.fillStyle='#f3f4f7';sc.fillRect(0,0,1960,1170);
sc.fillStyle='#20232a';sc.font='bold 26px sans-serif';sc.fillText('Fusion study · Same image / material / position / 2000-attempt continuation',20,40);
['A · Current color matching','B · Gentle fusion','C · Strong fusion'].forEach((t,i)=>{sc.font='22px sans-serif';sc.fillText(t,20+i*650,88);});
rows.forEach((row,n)=>{row.results.forEach((c:any,i:number)=>sc.drawImage(c,20+i*650,110+n*530));sc.fillStyle='#65708a';sc.font='18px sans-serif';sc.fillText(`Case ${n+1} · ${row.case.id} · Existing painting reference (not an uploaded photo)`,20,610+n*530);});
writeFileSync(out+'/comparison.png',sheet.toBuffer('image/png'));
// Detail sheet uses identical crops in all columns.
const detail=createCanvas(1500,1040),dc=detail.getContext('2d');dc.fillStyle='#f3f4f7';dc.fillRect(0,0,1500,1040);
rows.forEach((row,n)=>row.results.forEach((c:any,i:number)=>{const p=row.case;dc.drawImage(c,p.x-p.width*.85,p.y-p.height*.85,p.width*1.7,p.height*1.7,i*500,n*520+30,500,480);}));
writeFileSync(out+'/details.png',detail.toBuffer('image/png'));
const after=hashes();if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Source changed during experiment');
writeFileSync(out+'/results.json',JSON.stringify({settings,budget:2000,sourceHashesBefore:before,sourceHashesAfter:after,results:report},null,2));
console.log('Done. Production source hashes unchanged.');
}
main();
