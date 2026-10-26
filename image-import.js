'use strict';
// Browser-local image sampling shared with deterministic, DOM-free checks.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BeadImageImport=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const profiles={
  general:{label:'通用图片',sampling:'edge',tolerance:8,hint:'保边采样减少不同色面混在同一颗豆里，适合照片、海报与其他图片。'},
  artwork:{label:'画作',sampling:'edge',tolerance:6,hint:'优先保留主色面和连续分界；柔和渐变仍按区域采样。'},
  album:{label:'专辑封面',sampling:'edge',tolerance:6,hint:'保留完整排版，分别保护字笔画与人物服饰的色面边界。低格数无法保证小字可读。'},
  cartoon:{label:'卡通人物',sampling:'nearest',tolerance:8,hint:'原色采样保留清楚线条与色块，支持全身、配饰和场景；不套用宠物头像裁切。'},
  pet:{label:'宠物头像',sampling:'nearest',tolerance:10,hint:'沿用原色采样与五官修整，保留眼神、口鼻和透明轮廓。'}
 };
 function options(v={}){return {kind:Object.hasOwn(profiles,v.kind)?v.kind:'general',fit:v.fit==='cover'?'cover':'contain',sampling:['nearest','area','edge'].includes(v.sampling)?v.sampling:'auto',detail:v.detail==='off'?'off':'auto'};}
 function layout(sw,sh,w,h,fit='contain'){
  if(![sw,sh,w,h].every(v=>Number.isInteger(v)&&v>0)||w>416||h>416)throw Error('图片或画布尺寸无效');
  if(fit==='cover'){const scale=Math.max(w/sw,h/sh),cw=w/scale,ch=h/scale;return {sx:(sw-cw)/2,sy:(sh-ch)/2,sw:cw,sh:ch,x:0,y:0,w,h};}
  const scale=Math.min(w/sw,h/sh),dw=Math.max(1,Math.round(sw*scale)),dh=Math.max(1,Math.round(sh*scale));
  return {sx:0,sy:0,sw,sh,x:Math.floor((w-dw)/2),y:Math.floor((h-dh)/2),w:dw,h:dh};
 }
 const hex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
 function sample(bytes,sw,sh,w,h,settings={}){
  if(!bytes||bytes.length!==sw*sh*4)throw Error('图片像素数据无效');
  const o=options(settings),box=layout(sw,sh,w,h,o.fit),method=o.sampling==='auto'?(o.detail==='off'?(o.kind==='pet'||o.kind==='cartoon'?'nearest':'area'):profiles[o.kind].sampling):o.sampling,out=Array(w*h).fill(null);
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
  return method==='edge'?edgeSample(bytes,sw,sh,w,h,box,out):out;
 }
 const channels=c=>c.slice(1).match(/../g).map(v=>parseInt(v,16));
 function lab(v){const [r,g,b]=v.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116,x=f((.4124564*r+.3575761*g+.1804375*b)/.95047),y=f(.2126729*r+.7151522*g+.072175*b),z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);return [116*y-16,500*(x-y),200*(y-z)];}
 const distance=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
 function edgeSample(bytes,sw,sh,w,h,box,area){
  const out=area.slice();
  for(let y=0;y<box.h;y++)for(let x=0;x<box.w;x++){
   const target=(box.y+y)*w+box.x+x;if(area[target]===null)continue;
   const points=[];for(let yy=0;yy<6;yy++)for(let xx=0;xx<6;xx++){
    const sx=Math.min(sw-1,Math.floor(box.sx+(x+(xx+.5)/6)*box.sw/box.w)),sy=Math.min(sh-1,Math.floor(box.sy+(y+(yy+.5)/6)*box.sh/box.h)),i=(sy*sw+sx)*4;
    if(bytes[i+3]>=128){const rgb=[bytes[i],bytes[i+1],bytes[i+2]];points.push({rgb,lab:lab(rgb),x:xx,y:yy});}
   }
   if(points.length<18)continue;
   let first=points[0],second=points.reduce((a,b)=>distance(b.lab,first.lab)>distance(a.lab,first.lab)?b:a),a=first.lab.slice(),b=second.lab.slice(),groups;
   for(let iteration=0;iteration<4;iteration++){
    groups=[[],[]];for(const p of points)groups[distance(p.lab,a)<=distance(p.lab,b)?0:1].push(p);if(groups.some(g=>!g.length))break;
    [a,b]=groups.map(g=>[0,1,2].map(k=>g.reduce((s,p)=>s+p.lab[k],0)/g.length));
   }
   if(groups.some(g=>g.length<points.length*.18)||distance(a,b)<100)continue;
   const centers=groups.map(g=>[g.reduce((s,p)=>s+p.x,0)/g.length,g.reduce((s,p)=>s+p.y,0)/g.length]);
   // A coherent split across the footprint, not interleaved grain/checkerboard.
   if(Math.hypot(centers[0][0]-centers[1][0],centers[0][1]-centers[1][1])<1.8)continue;
   const main=groups[0].length>=groups[1].length?0:1;if(groups[main].length/points.length<.55)continue;
   const mean=[0,1,2].map(k=>groups[main].reduce((s,p)=>s+p.rgb[k],0)/groups[main].length);
   out[target]=hex(mean);
  }
  return out;
 }
 function boundaryPairs(pixels,w,h){
  const cache=new Map(),values=pixels.map(c=>{if(c===null)return null;if(!cache.has(c))cache.set(c,lab(channels(c)));return cache.get(c)}),out=[];
  const vector=(i,j)=>values[i]&&values[j]?values[j].map((v,k)=>v-values[i][k]):null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(const [dx,dy]of [[1,0],[0,1]]){
   if(x+dx>=w||y+dy>=h)continue;const i=y*w+x,j=i+dy*w+dx,v=vector(i,j);if(!v)continue;const length=Math.hypot(...v);if(length<6)continue;
   let support=0;for(const offset of [-1,1]){const xx=x+(dy?offset:0),yy=y+(dx?offset:0);if(xx<0||yy<0||xx+dx>=w||yy+dy>=h)continue;const a=yy*w+xx,b=a+dy*w+dx,other=vector(a,b);if(other&&Math.hypot(...other)>=4&&v.reduce((s,c,k)=>s+c*other[k],0)/(length*Math.hypot(...other))>.6)support++;}
   if(support)out.push([i,j]);
  }
  return out;
 }
 function textBands(bytes,sw,sh){
  const rows=[];for(let y=0;y<sh;y++){
   let dark=0,light=0,middle=0;for(let x=0;x<sw;x+=2){const i=(y*sw+x)*4;if(bytes[i+3]<128){middle++;continue}const v=.2126*bytes[i]+.7152*bytes[i+1]+.0722*bytes[i+2];if(v<55)dark++;else if(v>155)light++;else middle++;}
   const count=dark+light+middle;rows.push(dark/count>.55&&light/count>.015&&middle/count<.15);
  }
  const bands=[];for(let y=0;y<sh;y++){if(!rows[y])continue;const first=y;while(y+1<sh&&rows[y+1])y++;const last=y;if(last-first<Math.max(4,sh*.018)||last-first>sh*.22)continue;
   let minX=sw,maxX=0,n=0,bn=0,ink=[0,0,0],background=[0,0,0];for(let yy=first;yy<=last;yy+=2)for(let x=0;x<sw;x+=2){const i=(yy*sw+x)*4,v=.2126*bytes[i]+.7152*bytes[i+1]+.0722*bytes[i+2];if(v>155){minX=Math.min(minX,x);maxX=Math.max(maxX,x);n++;ink=ink.map((v,k)=>v+bytes[i+k]);}else if(v<55){bn++;background=background.map((v,k)=>v+bytes[i+k]);}}
   if(n&&bn&&maxX-minX>sw*.3)bands.push({first,last,ink:hex(ink.map(v=>v/n)),background:hex(background.map(v=>v/bn))});
  }
  return bands;
 }
 function protectText(bytes,sw,sh,w,h,settings={},pixels){
  const out=pixels.slice(),indices=[],bands=textBands(bytes,sw,sh),box=layout(sw,sh,w,h,options(settings).fit);
  for(let y=0;y<box.h;y++){
   const sy=box.sy+(y+.5)*box.sh/box.h,band=bands.find(b=>sy>=b.first-box.sh/box.h*.35&&sy<=b.last+box.sh/box.h*.35);if(!band)continue;
   for(let x=0;x<box.w;x++){
    const target=(box.y+y)*w+box.x+x;if(out[target]===null)continue;
    const sx=Math.min(sw-1,Math.floor(box.sx+(x+.5)*box.sw/box.w)),sampleY=Math.min(sh-1,Math.floor(box.sy+(y+.5)*box.sh/box.h)),i=(sampleY*sw+sx)*4;out[target]=(.2126*bytes[i]+.7152*bytes[i+1]+.0722*bytes[i+2]>110)?band.ink:band.background;indices.push(target);
   }
  }
  return {pixels:out,protected:indices,bands:bands.length};
 }
 function matchPalette(pixels,w,h,palette,{preserveBoundaries=false}={}){
  const entries=palette.map(v=>({hex:v.hex.toLowerCase(),lab:lab(channels(v.hex))})),cache=new Map(),ranks=pixels.map(c=>{if(c===null)return null;if(!cache.has(c)){const l=lab(channels(c));cache.set(c,entries.map(e=>({hex:e.hex,lab:e.lab,error:distance(e.lab,l)})).sort((a,b)=>a.error-b.error).slice(0,6));}return cache.get(c)}),out=ranks.map(v=>v?v[0].hex:null);
  if(!preserveBoundaries)return out;
  // Resolve only coherent boundaries that nearest-brand matching collapsed.
  // Budget the extra color error; do not paint a dark line onto a pale boundary.
  const edges=boundaryPairs(pixels,w,h);
  for(const [i,j]of edges){if(out[i]!==out[j]||distance(lab(channels(pixels[i])),lab(channels(pixels[j])))<100)continue;let best=null,cost=Infinity;
   for(const [at,other]of [[i,j],[j,i]])for(const candidate of ranks[at]){
    if(candidate.hex===out[other]||candidate.error>ranks[at][0].error+25)continue;
    const otherLab=entries.find(e=>e.hex===out[other]).lab;if(distance(candidate.lab,otherLab)<25)continue;
    const value=candidate.error-ranks[at][0].error;if(value<cost){cost=value;best={at,hex:candidate.hex};}
   }
   if(best)out[best.at]=best.hex;
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
 // Contrast-guided sampling: independent browser implementation, not a PixelOE port.
 // Select supported minority features inside each bead footprint; never expand alpha.
 function structure(bytes,sw,sh,w,h,settings={},ordinary){
  const o=options(settings),base=ordinary?ordinary.slice():sample(bytes,sw,sh,w,h,o),pixels=base.slice(),protectedCells=[],accents=new Set();
  if(o.detail==='off'||w>104||h>104||sw<=w||sh<=h)return {pixels,protected:protectedCells,active:false,changed:0};
  if(!bytes||bytes.length!==sw*sh*4||base.length!==w*h)throw Error('保结构输入无效');
  const box=layout(sw,sh,w,h,o.fit),luma=v=>.2126*v[0]+.7152*v[1]+.0722*v[2];let changed=0;
  for(let y=0;y<box.h;y++)for(let x=0;x<box.w;x++){
   const target=(box.y+y)*w+box.x+x;if(base[target]===null)continue;
   const x0=Math.max(0,Math.ceil(box.sx+x*box.sw/box.w)),y0=Math.max(0,Math.ceil(box.sy+y*box.sh/box.h)),x1=Math.min(sw,Math.ceil(box.sx+(x+1)*box.sw/box.w)),y1=Math.min(sh,Math.ceil(box.sy+(y+1)*box.sh/box.h)),groups=new Map();let count=0;
   for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){
    const i=(yy*sw+xx)*4;if(bytes[i+3]<128)continue;count++;
    const key=(bytes[i]>>5)*64+(bytes[i+1]>>5)*8+(bytes[i+2]>>5);let g=groups.get(key);
    if(!g){g={n:0,sum:[0,0,0],minX:xx,maxX:xx,minY:yy,maxY:yy,positions:[],values:[]};groups.set(key,g)}
    g.n++;for(let k=0;k<3;k++)g.sum[k]+=bytes[i+k];g.minX=Math.min(g.minX,xx);g.maxX=Math.max(g.maxX,xx);g.minY=Math.min(g.minY,yy);g.maxY=Math.max(g.maxY,yy);g.positions.push(yy*sw+xx);g.values.push([bytes[i],bytes[i+1],bytes[i+2]]);
   }
   if(count<8||groups.size<2)continue;
   const sorted=[...groups.values()].sort((a,b)=>b.n-a.n),dominant=sorted[0],main=dominant.sum.map(v=>v/dominant.n);
   // Dense texture with no stable background is not a reason to invent a detail.
   if(dominant.n/count<.42||groups.size>16)continue;
   let best=null,bestScore=0,bestAccent=false;
   for(const g of sorted.slice(1)){
    const fraction=g.n/count;if(fraction<.055||fraction>.42||g.n<Math.max(3,Math.sqrt(count)*.45))continue;
    const mean=g.sum.map(v=>v/g.n),dy=Math.abs(luma(mean)-luma(main)),dc=Math.max(...mean.map((v,k)=>Math.abs(v-main[k])));
    if(dy<48&&dc<90)continue;
    const positions=new Set(g.positions);let connected=0;
    for(const p of g.positions){const px=p%sw;if([p-sw,p+sw,...(px?[p-1,p-sw-1,p+sw-1]:[]),...(px<sw-1?[p+1,p-sw+1,p+sw+1]:[])].some(q=>positions.has(q)))connected++;}
    if(connected/g.n<.75)continue;
    const spanX=(g.maxX-g.minX+1)/(x1-x0),spanY=(g.maxY-g.minY+1)/(y1-y0),density=g.n/((g.maxX-g.minX+1)*(g.maxY-g.minY+1));
    let mx=0,my=0;for(const p of g.positions){mx+=p%sw;my+=Math.floor(p/sw)}mx/=g.n;my/=g.n;let vx=0,vy=0,cov=0;for(const p of g.positions){const dx=p%sw-mx,dy=Math.floor(p/sw)-my;vx+=dx*dx;vy+=dy*dy;cov+=dx*dy}const linear=Math.hypot(vx-vy,2*cov)/Math.max(1,vx+vy)>.85;
    if((density<.34&&!linear)||(Math.max(spanX,spanY)<.45&&!(density>.75&&fraction>=.055)))continue;
    const score=(dy+dc*.3)*Math.sqrt(fraction)*Math.max(density,linear?.6:0);
    if(score>bestScore){let representative=g.values[0],distance=Infinity;for(const v of g.values){const d=v.reduce((sum,c,k)=>sum+(c-mean[k])**2,0);if(d<distance){distance=d;representative=v}}best=hex(representative);bestScore=score;bestAccent=Math.max(...mean)-Math.min(...mean)>90&&density>.75&&dc>90;}
   }
   if(best){pixels[target]=best;protectedCells.push(target);if(bestAccent)accents.add(target);}
  }
  const detected=new Set(protectedCells),channels=c=>c.slice(1).match(/../g).map(v=>parseInt(v,16));
  const accepted=protectedCells.filter(i=>{if(accents.has(i))return true;const c=channels(pixels[i]),x=i%w,y=Math.floor(i/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!(dx||dy)||x+dx<0||x+dx>=w||y+dy<0||y+dy>=h)continue;const j=i+dy*w+dx;if(detected.has(j)){const other=channels(pixels[j]);if(c.every((v,k)=>Math.abs(v-other[k])<56))return true}}return false;});
  const keep=new Set(accepted);for(const i of protectedCells)if(!keep.has(i))pixels[i]=base[i];protectedCells.splice(0,protectedCells.length,...accepted);changed=accepted.filter(i=>pixels[i]!==base[i]).length;
  if(protectedCells.length>Math.max(12,Math.floor(base.filter(c=>c!==null).length*.3)))return {pixels:base,protected:[],active:true,changed:0,suppressed:true};
  return {pixels,protected:protectedCells,active:true,changed,suppressed:false};
 }
 return {profiles,options,layout,sample,removeWhite,structure,boundaryPairs,matchPalette,textBands,protectText};
});
