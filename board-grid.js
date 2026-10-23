'use strict';
// Lossless, top-left aligned 52×52 tiling. Palette IDs belong to the full artwork.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BeadBoards=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const SIZE=52,MAX_SIZE=416;
 function plan(w,h,pixels,palette){
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<4||h<4||w>MAX_SIZE||h>MAX_SIZE||!Array.isArray(pixels)||pixels.length!==w*h)throw Error('画布宽高需为 4–416 格，且豆位数量完整');
  const counts=new Map();for(const c of pixels){if(c===null)continue;if(!/^#[0-9a-f]{6}$/i.test(c))throw Error('豆位颜色无效');counts.set(c,(counts.get(c)||0)+1)}
  if(!palette)palette=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([hex,count],i)=>({hex,count,id:(i+1).toString(36).toUpperCase().padStart(2,'0')}));
  const registry=new Map(palette.map(v=>[v.hex,v]));
  if(registry.size!==counts.size||[...counts].some(([c,n])=>registry.get(c)?.count!==n)||new Set(palette.map(v=>v.id)).size!==palette.length)throw Error('整图色号与豆位不一致，请刷新后重新导出');
  const columns=Math.ceil(w/SIZE),rows=Math.ceil(h/SIZE),boards=[];
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
   const x=column*SIZE,y=row*SIZE,width=Math.min(SIZE,w-x),height=Math.min(SIZE,h-y),data=Array(SIZE*SIZE).fill(null),local=new Map();
   for(let ly=0;ly<height;ly++)for(let lx=0;lx<width;lx++){const c=pixels[(y+ly)*w+x+lx];data[ly*SIZE+lx]=c;if(c!==null)local.set(c,(local.get(c)||0)+1)}
   boards.push({code:'R'+String(row+1).padStart(2,'0')+'-C'+String(column+1).padStart(2,'0'),row:row+1,column:column+1,x,y,width,height,data,count:[...local.values()].reduce((a,b)=>a+b,0),colors:palette.filter(v=>local.has(v.hex)).map(v=>({...v,total:v.count,count:local.get(v.hex)}))});
  }
  return {w,h,size:SIZE,columns,rows,boards,palette:palette.map(v=>({...v})),count:[...counts.values()].reduce((a,b)=>a+b,0)};
 }
 function csv(palette,brand=false){return '\uFEFF'+(brand?'MARD色号':'自定义编号')+',HEX,R,G,B,本表豆数,整图豆数,说明\r\n'+palette.map(v=>[v.id,v.hex.toUpperCase(),...v.hex.slice(1).match(/../g).map(v=>parseInt(v,16)),v.count,v.total??v.count,brand?'MARD 205 色对照表':'整图自定义颜色索引，非品牌色号'].join(',')).join('\r\n')+'\r\n'}
 const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
 function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0}
 async function zip(entries){
  const chunks=[],central=[],encoder=new TextEncoder();let offset=0,centralSize=0;
  for(const entry of entries){
   const name=encoder.encode(entry.name);if(!name.length||name.length>65535||entry.name.startsWith('/')||entry.name.split('/').includes('..'))throw Error('压缩包路径无效');
   const bytes=typeof entry.data==='string'?encoder.encode(entry.data):entry.data instanceof Uint8Array?entry.data:new Uint8Array(await entry.data.arrayBuffer());
   if(offset+bytes.length>256*1024*1024)throw Error('施工包超过 256MB，请减少用色或分别导出');
   const crc=crc32(bytes),header=new Uint8Array(30+name.length),hv=new DataView(header.buffer);
   hv.setUint32(0,0x04034b50,true);hv.setUint16(4,20,true);hv.setUint16(6,0x0800,true);hv.setUint16(12,33,true);hv.setUint32(14,crc,true);hv.setUint32(18,bytes.length,true);hv.setUint32(22,bytes.length,true);hv.setUint16(26,name.length,true);header.set(name,30);
   const cd=new Uint8Array(46+name.length),cv=new DataView(cd.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(14,33,true);cv.setUint32(16,crc,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);cd.set(name,46);
   chunks.push(header,bytes);central.push(cd);offset+=header.length+bytes.length;centralSize+=cd.length;
  }
  if(entries.length>65535)throw Error('施工包文件过多');
  const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  return new Blob([...chunks,...central,end],{type:'application/zip'});
 }
 return {SIZE,MAX_SIZE,plan,csv,zip,crc32};
});
