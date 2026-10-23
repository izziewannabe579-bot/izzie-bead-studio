'use strict';
// Canvas output and a printable, offline ZIP. No server calls or external libraries.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./board-grid.js'));else root.BeadBoardExport=factory(root.BeadBoards);})(typeof globalThis!=='undefined'?globalThis:this,function(B){
 const PAGE_COLORS=45,ink='#303b36',green='#416f57';
 const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
 const description=system=>system==='mard'?'MARD 205 色 · 品牌色号':'自由 RGB · 自定义编号，非品牌色号';
 const contrast=c=>{const v=c.slice(1).match(/../g).map(v=>parseInt(v,16));return v[0]*.299+v[1]*.587+v[2]*.114>145?ink:'#fff'};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function fitText(x,text,maxWidth){while(x.measureText(text).width>maxWidth&&text.length>1)text=text.slice(0,-2)+'…';return text}
 function overview(plan,title='拼接位置总览'){
  const tile=Math.min(260,Math.floor(1200/plan.columns)),s=tile/52,m=30,gap=32,c=make(m*2+tile*plan.columns,100+(tile+gap)*plan.rows),x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle=ink;x.font='bold 22px sans-serif';x.fillText(fitText(x,title,c.width-60),m,30);x.font='14px sans-serif';x.fillText(plan.columns+' 列 × '+plan.rows+' 行 · 左上起排 · 不镜像',m,55);
  for(const b of plan.boards){const px=m+(b.column-1)*tile,py=80+(b.row-1)*(tile+gap);x.fillStyle=green;x.font='bold '+Math.min(17,tile/9)+'px sans-serif';x.fillText(b.code+(b.count?'':' · 空板'),px+4,py+19);x.fillStyle='#edf0eb';x.fillRect(px,py+gap,tile,tile);
   x.fillStyle='#fff';x.fillRect(px,py+gap,b.width*s,b.height*s);b.data.forEach((v,i)=>{if(v){x.fillStyle=v;x.fillRect(px+i%52*s,py+gap+Math.floor(i/52)*s,s+.15,s+.15)}});x.strokeStyle=green;x.lineWidth=2;x.strokeRect(px,py+gap,tile,tile);
  }return c;
 }
 function chart(plan,b,title,system,page=0){
  const pages=Math.max(1,Math.ceil(b.colors.length/PAGE_COLORS));if(!Number.isInteger(page)||page<0||page>=pages)throw Error('色卡页码无效');
  const entries=b.colors.slice(page*PAGE_COLORS,(page+1)*PAGE_COLORS),s=30,m=56,top=130,columns=5,rows=Math.ceil(entries.length/columns),cardsY=top+m+52*s+m+70;
  const c=make(52*s+2*m,cardsY+Math.max(1,rows)*34+36),x=c.getContext('2d'),ids=new Map(plan.palette.map(v=>[v.hex,v.id]));
  x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle=ink;x.font='bold 28px sans-serif';x.fillText(fitText(x,b.code+' · '+title+' · 分板施工图',c.width-2*m),m,40);x.font='20px sans-serif';
  x.fillText('整图列 '+(b.x+1)+'–'+(b.x+b.width)+' / 行 '+(b.y+1)+'–'+(b.y+b.height)+' · 本板 '+b.count+' 颗 / '+b.colors.length+' 色',m,74);
  x.fillText('52×52 板 · 板内坐标 1–52 · 有效区域 '+b.width+'×'+b.height+' · 色卡 '+(page+1)+'/'+pages,m,104);
  const gy=top+m;x.fillStyle='#edf0eb';x.fillRect(m,gy,52*s,52*s);x.fillStyle='#fff';x.fillRect(m,gy,b.width*s,b.height*s);
  b.data.forEach((v,i)=>{if(!v)return;const px=m+i%52*s,py=gy+Math.floor(i/52)*s;x.fillStyle=v;x.fillRect(px,py,s,s);x.fillStyle=contrast(v);const id=ids.get(v);x.font='bold '+(id.length>3?10:12)+'px monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(id,px+s/2,py+s/2)});
  x.strokeStyle='#64705f';for(let n=0;n<=52;n++){x.lineWidth=n%5===0||n===52?1.4:.45;x.beginPath();x.moveTo(m+n*s,gy);x.lineTo(m+n*s,gy+52*s);x.stroke();x.beginPath();x.moveTo(m,gy+n*s);x.lineTo(m+52*s,gy+n*s);x.stroke()}
  x.fillStyle=ink;x.font='14px monospace';x.textAlign='center';x.textBaseline='middle';for(let n=0;n<52;n++){const t=String(n+1);x.fillText(t,m+(n+.5)*s,gy-25);x.fillText(t,m+(n+.5)*s,gy+52*s+25);x.fillText(t,m-25,gy+(n+.5)*s);x.fillText(t,m+52*s+25,gy+(n+.5)*s)}
  x.textAlign='left';x.textBaseline='alphabetic';x.font='bold 20px sans-serif';x.fillText('本板色卡与用量 · '+description(system),m,cardsY-30);x.font='16px sans-serif';x.fillText('所有分板沿用整图编号；灰色区域超出画幅，不放豆。方向均为原图正向。',m,cardsY-7);
  if(!entries.length){x.fillStyle=ink;x.fillText('本板为空，仅保留拼接位置。',m,cardsY+25)}
  entries.forEach((v,i)=>{const px=m+i%columns*(c.width-2*m)/columns,py=cardsY+Math.floor(i/columns)*34+10;x.fillStyle=v.hex;x.fillRect(px,py,22,22);x.strokeStyle='#a5aaa3';x.lineWidth=1;x.strokeRect(px+.5,py+.5,21,21);x.fillStyle=ink;x.font='16px monospace';x.fillText(v.id+' '+v.hex.toUpperCase()+' ×'+v.count,px+30,py+17)});
  return {canvas:c,entries,pages};
 }
 const blob=c=>new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('图片导出失败，请尝试较小画布')),'image/png'));
 async function packageBoards(plan,title,system,onProgress=()=>{}){
  const pageCount=plan.boards.reduce((n,b)=>n+Math.max(1,Math.ceil(b.colors.length/PAGE_COLORS)),0);if(pageCount>512)throw Error('分板色卡超过 512 页，请先减少杂色或选用 MARD 后再导出');
  const files=[],prints=[],manifest={format:'izzie-bead-boards',version:1,title,width:plan.w,height:plan.h,boardSize:52,columns:plan.columns,rows:plan.rows,origin:'top-left',mirrored:false,colorSystem:system,palette:plan.palette,boards:[]};
  files.push({name:'拼接总览.png',data:await blob(overview(plan,title+' · 拼接位置总览'))},{name:'整图颜色用量.csv',data:B.csv(plan.palette,system==='mard')});let completed=0;
  for(const b of plan.boards){
   const pages=Math.max(1,Math.ceil(b.colors.length/PAGE_COLORS));
   for(let p=0;p<pages;p++){const {canvas:c}=chart(plan,b,title,system,p),name='施工图/'+b.code+(pages>1?'-色卡'+String(p+1).padStart(2,'0'):'')+'.png';files.push({name,data:await blob(c)});c.width=1;c.height=1;prints.push({name,code:b.code,page:p+1,pages});onProgress(++completed,pageCount);await new Promise(resolve=>setTimeout(resolve,0))}
   const pixel=make(52,52),px=pixel.getContext('2d');b.data.forEach((v,i)=>{if(v){px.fillStyle=v;px.fillRect(i%52,Math.floor(i/52),1,1)}});
   files.push({name:'导入图/'+b.code+'-52x52.png',data:await blob(pixel)},{name:'用量表/'+b.code+'.csv',data:B.csv(b.colors,system==='mard')});
   manifest.boards.push({code:b.code,row:b.row,column:b.column,globalColumns:[b.x+1,b.x+b.width],globalRows:[b.y+1,b.y+b.height],width:b.width,height:b.height,beadCount:b.count,colors:b.colors,pixelData:b.data});
  }
  const legendRows=plan.palette.map(v=>'<tr><td>'+escape(v.id)+'</td><td style="background:'+v.hex+';width:12mm"></td><td>'+v.hex.toUpperCase()+'</td><td>'+v.count+'</td></tr>').join('');
  const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>'+escape(title)+' · 分板打印</title><style>body{font:14px system-ui;color:#303b36;margin:20px}h1{font-size:24px}img{display:block;max-width:100%;margin:auto}.page{break-after:page;page-break-after:always}table{border-collapse:collapse}td,th{padding:5px 12px;border:1px solid #aaa}thead{display:table-header-group}tr{break-inside:avoid}button{padding:12px 20px;margin-bottom:20px}@page{size:A4 portrait;margin:10mm}@media print{body{margin:0}.controls{display:none}.page img{max-height:273mm;max-width:190mm;width:auto}a{color:inherit}}</style><div class="controls"><h1>'+escape(title)+' · 52×52 分板施工图</h1><p>先解压整个 ZIP，再打开本文件。使用浏览器打印或另存为 PDF。默认 A4，按格点施工；不是实物 1:1 垫板图。</p><p>编号全图统一，不镜像；R 表示板行，C 表示板列。每张板内从左上角 1/1 开始，灰区不放豆。用色多时，同一板的色卡分多页，格网重复。</p><button onclick="window.print()">打印 / 另存为 PDF</button></div><section class="page"><img src="拼接总览.png" alt="拼接总览"></section>'+prints.map(p=>'<section class="page"><img src="'+p.name+'" alt="'+p.code+' 色卡 '+p.page+'/'+p.pages+'"></section>').join('')+'<h1>整图颜色用量 · '+escape(description(system))+'</h1><table><thead><tr><th>编号</th><th>色块</th><th>HEX</th><th>总豆数</th></tr></thead><tbody>'+legendRows+'</tbody></table></html>';
  files.push({name:'打印图纸.html',data:html},{name:'分板数据.json',data:JSON.stringify(manifest,null,2)},{name:'使用说明.txt',data:'Izzie豆作 · 52×52 分板施工包\r\n\r\n整图 '+plan.w+'×'+plan.h+'，'+plan.columns+' 列 × '+plan.rows+' 行，共 '+plan.boards.length+' 块，实际用豆 '+plan.count+' 颗。\r\n1. 先完整解压，再打开打印图纸.html，打印或另存 PDF。\r\n2. 按拼接总览从左上角开始。R 是板行，C 是板列；所有分板保持原图方向，不镜像。\r\n3. 各板网格固定52×52，板内坐标1–52。边缘灰区超出画幅，不放豆；白色豆以格内编号区分于无编号空格。\r\n4. 分板后不重新量化；所有板编号与整图颜色用量.csv一致。自由RGB编号不是品牌珠子色号。\r\n5. 每板CSV为本板用量；整图CSV为总量。导入图是52×52透明像素PNG。分板数据含完整豆位，可检查重组。\r\n6. 图纸不是实物1:1垫板图；不自动镜像。\r\n'});
  return B.zip(files);
 }
 return {PAGE_COLORS,overview,chart,packageBoards};
});
