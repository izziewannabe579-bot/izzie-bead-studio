'use strict';
// Shared, DOM-free state for precise portrait editing. Coordinates in logs are 1-based.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PortraitTransfer=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const clone=value=>value==null?null:JSON.parse(JSON.stringify(value));
 function grid(pixels,w,h){
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<4||h<4||w>104||h>104||!Array.isArray(pixels)||pixels.length!==w*h)throw Error('图纸尺寸或豆位数量无效');
  return pixels.map(c=>{if(c===null)return null;if(typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))throw Error('豆位颜色无效');return c.toLowerCase();});
 }
 function create(w,h,raw,smoothed,{origin='image',features='',smoothedApplied=true}={}){
  raw=grid(raw,w,h);smoothed=grid(smoothed,w,h);
  if(raw.some((c,i)=>(c===null)!==(smoothed[i]===null)))throw Error('减杂色版改变了透明轮廓');
  return {version:1,w,h,origin:origin==='image'?'image':'current',raw,smoothed,smoothedApplied:!!smoothedApplied,features:String(features).slice(0,500),protected:[],annotations:{},lockShape:true,lockDetails:true};
 }
 function normalize(value,w,h){
  if(value==null)return null;
  if(value.w!==w||value.h!==h)throw Error('转译记录与当前画布尺寸不一致');
  const t=create(w,h,value.raw,value.smoothed,value);
  if(!Array.isArray(value.protected)||value.protected.some(i=>!Number.isInteger(i)||i<0||i>=w*h||t.raw[i]===null))throw Error('关键豆位记录无效');
  t.protected=[...new Set(value.protected)];t.lockShape=value.lockShape!==false;t.lockDetails=value.lockDetails!==false;
  if(value.annotations&&typeof value.annotations==='object')for(const [key,a]of Object.entries(value.annotations)){
   const i=Number(key);if(!Number.isInteger(i)||i<0||i>=w*h||!a||typeof a!=='object')throw Error('修改说明无效');
   t.annotations[i]={part:String(a.part||'局部修整').slice(0,60),reason:String(a.reason||'').slice(0,300)};
  }
  return t;
 }
 function project(s){
  if(!s||typeof s!=='object')throw Error('项目格式无效');
  const w=s.w??s.gridSize,h=s.h??s.gridSize,pixels=grid(s.data??s.pixelData,w,h);
  const t=normalize(s.transfer,w,h);
  if(t?.lockShape&&pixels.some((c,i)=>(c===null)!==(t.raw[i]===null)))throw Error('锁定轮廓与当前豆位不一致');
  return {w,h,data:pixels,title:typeof s.title==='string'?s.title.slice(0,180):typeof s.source==='string'?s.source.replace(/\.[^.]+$/,''):'未命名作品',colorSystem:s.colorSystem==='mard'?'mard':'rgb',transfer:t};
 }
 function canWrite(t,index,value){return !t||(!(t.lockShape&&(t.raw[index]===null)!==(value===null))&&!(t.lockDetails&&t.protected.includes(index)));}
 function write(pixels,t,index,value,annotation){
  if(!Number.isInteger(index)||index<0||index>=pixels.length)throw Error('豆位坐标无效');
  if(value!==null&&!/^#[0-9a-f]{6}$/i.test(value))throw Error('豆位颜色无效');
  value=value===null?null:value.toLowerCase();
  if(!canWrite(t,index,value)||pixels[index]===value)return false;
  pixels[index]=value;
  if(t)t.annotations[index]={part:String(annotation?.part||'局部修整').slice(0,60),reason:String(annotation?.reason||'').slice(0,300)};
  return true;
 }
 function diff(t,pixels){
  if(!t)return [];
  return pixels.flatMap((to,i)=>to===t.smoothed[i]?[]:[{column:i%t.w+1,row:Math.floor(i/t.w)+1,from:t.smoothed[i],to,part:t.annotations[i]?.part||'局部修整',reason:t.annotations[i]?.reason||''}]);
 }
 function protectResult(t,before,after){return after.map((c,i)=>canWrite(t,i,c)?c:before[i]);}
 function csv(changes){
  const field=v=>{let s=v===null?'空位':String(v);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return '\uFEFF列,行,修改前HEX,修改后HEX,部位,原因\n'+changes.map(c=>[c.column,c.row,c.from,c.to,c.part,c.reason].map(field).join(',')).join('\n')+'\n';
 }
 return {clone,grid,create,normalize,project,canWrite,write,diff,protectResult,csv};
});
