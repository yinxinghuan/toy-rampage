// Thumbnail-only alpha fitting. Never change field canvases, pivots or drag footprints.
const previews=new Map();
export function cropBenchCanvas(source){
 const w=source.width,h=source.height,rgba=source.getContext('2d').getImageData(0,0,w,h).data;
 let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(rgba[(y*w+x)*4+3]>12){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 if(x1<0)return source.toDataURL();
 const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;
 out.getContext('2d').drawImage(source,x0,y0,out.width,out.height,0,0,out.width,out.height);
 return out.toDataURL();
}
export function bindBenchPreviews(root){
 function scan(){for(const img of root.querySelectorAll('.px-bench__slot img.px-sprite:not([data-bench-fit])')){
  img.dataset.benchFit='pending';const src=img.src;
  const fit=()=>{if(img.src!==src)return;try{
   if(!previews.has(src)){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);previews.set(src,cropBenchCanvas(c));}
   img.src=previews.get(src);img.dataset.benchFit='true';
  }catch{img.dataset.benchFit='fallback';}};
  if(img.complete&&img.naturalWidth)fit();else img.addEventListener('load',fit,{once:true});
 }}
 const observer=new MutationObserver(scan);observer.observe(root,{childList:true,subtree:true});scan();
 return()=>observer.disconnect();
}
