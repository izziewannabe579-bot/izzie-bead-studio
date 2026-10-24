'use strict';
// Browser-local image sampling shared with deterministic, DOM-free checks.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BeadImageImport=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const profiles={
  general:{label:'通用图片',sampling:'area',tolerance:8,hint:'保留完整画面，适合照片、海报与其他图片。'},
  artwork:{label:'画作',sampling:'area',tolerance:6,hint:'区域采样保留整体色调与明暗层次，轻度合并近似色。'},
  album:{label:'专辑封面',sampling:'area',tolerance:6,hint:'保留封面背景与完整排版。小字在低格数下可能不清楚，可增加整图尺寸后分板。'},
  cartoon:{label:'卡通人物',sampling:'nearest',tolerance:8,hint:'原色采样保留清楚线条与色块，支持全身、配饰和场景；不套用宠物头像裁切。'},
  pet:{label:'宠物头像',sampling:'nearest',tolerance:10,hint:'沿用原色采样与五官修整，保留眼神、口鼻和透明轮廓。'}
 };
 function options(v={}){return {kind:Object.hasOwn(profiles,v.kind)?v.kind:'general',fit:v.fit==='cover'?'cover':'contain',sampling:['nearest','area'].includes(v.sampling)?v.sampling:'auto'};}
 function layout(sw,sh,w,h,fit='contain'){
  if(![sw,sh,w,h].every(v=>Number.isInteger(v)&&v>0)||w>416||h>416)throw Error('图片或画布尺寸无效');
  if(fit==='cover'){const scale=Math.max(w/sw,h/sh),cw=w/scale,ch=h/scale;return {sx:(sw-cw)/2,sy:(sh-ch)/2,sw:cw,sh:ch,x:0,y:0,w,h};}
  const scale=Math.min(w/sw,h/sh),dw=Math.max(1,Math.round(sw*scale)),dh=Math.max(1,Math.round(sh*scale));
  return {sx:0,sy:0,sw,sh,x:Math.floor((w-dw)/2),y:Math.floor((h-dh)/2),w:dw,h:dh};
 }
 const hex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
 function sample(bytes,sw,sh,w,h,settings={}){
  if(!bytes||bytes.length!==sw*sh*4)throw Error('图片像素数据无效');
  const o=options(settings),box=layout(sw,sh,w,h,o.fit),method=o.sampling==='auto'?profiles[o.kind].sampling:o.sampling,out=Array(w*h).fill(null);
  for(let y=0;y<box.h;y++)for(let x=0;x<box.w;x++){
   const x0=box.sx+x*box.sw/box.w,y0=box.sy+y*box.sh/box.h,x1=box.sx+(x+1)*box.sw/box.w,y1=box.sy+(y+1)*box.sh/box.h;
   let value=null;
   if(method==='nearest'){
    const i=(Math.min(sh-1,Math.floor((y0+y1)/2))*sw+Math.min(sw-1,Math.floor((x0+x1)/2)))*4;
    if(bytes[i+3]>=128)value=hex([bytes[i],bytes[i+1],bytes[i+2]]);
   }else{
    let alpha=0,r=0,g=0,b=0;
    for(let yy=Math.floor(y0);yy<Math.ceil(y1)&&yy<sh;yy++)for(let xx=Math.floor(x0);xx<Math.ceil(x1)&&xx<sw;xx++){
     const weight=Math.max(0,Math.min(x1,xx+1)-Math.max(x0,xx))*Math.max(0,Math.min(y1,yy+1)-Math.max(y0,yy)),i=(yy*sw+xx)*4,a=weight*bytes[i+3];
     alpha+=a;r+=a*bytes[i];g+=a*bytes[i+1];b+=a*bytes[i+2];
    }
    // Alpha-weighted colors prevent dark fringes from transparent RGB values.
    if(alpha/((x1-x0)*(y1-y0))>=127.5)value=hex([r/alpha,g/alpha,b/alpha]);
   }
   out[(box.y+y)*w+box.x+x]=value;
  }
  return out;
 }
 function removeWhite(input,w,h){
  if(!Array.isArray(input)||input.length!==w*h)throw Error('豆位数量无效');
  const out=input.slice(),seen=new Uint8Array(out.length),queue=[];
  const visit=n=>{if(seen[n])return;seen[n]=1;const v=out[n],rgb=v?v.slice(1).match(/../g).map(c=>parseInt(c,16)):null;if(rgb&&!(Math.min(...rgb)>238&&Math.max(...rgb)-Math.min(...rgb)<15))return;out[n]=null;queue.push(n);};
  for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
  for(let p=0;p<queue.length;p++){const i=queue[p],x=i%w,y=Math.floor(i/w);if(x)visit(i-1);if(x<w-1)visit(i+1);if(y)visit(i-w);if(y<h-1)visit(i+w);}
  return out;
 }
 return {profiles,options,layout,sample,removeWhite};
});
