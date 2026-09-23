import {matchFusion,FUSIONS,fusionRankAllowed} from './fusions.js';

export function boardFusionHint(g,selected=null){
 if(g.paused||g.ended||g.choices.length)return null;
 const moves=[];
 for(const target of g.units)for(const source of [...g.units.map(u=>u.id),...g.reserve.map((_,i)=>'reserve:'+i)]){
  const p=g.preview(source,target.c,target.r);if(p.ok&&p.type==='fusion')moves.push({source,...p});
 }
 const move=moves.find(p=>p.source===selected||p.target.id===selected)||moves[0];
 if(move)return{move};
 const u=typeof selected==='number'?g.get(selected):null;
 const recipe=u&&FUSIONS.find(r=>[r.material,r.anchor].includes(u.kind)&&fusionRankAllowed(r,u.rank));
 return recipe?{recipe,unit:u}:null;
}

// A matching pair is information, never permission to skip placement rules.
export function benchFusionHint(g,selected=null){
 if(g.tray||g.ended||g.paused||g.choices.length||!['ready','wave'].includes(g.stage))return null;
 const reserve=g.reserve.map((unit,i)=>({unit,source:'reserve:'+i})).filter(x=>x.unit),pairs=[];
 for(const material of reserve)for(const anchor of [...reserve,...g.units.map(unit=>({unit,source:unit.id}))]){
  if(material.source===anchor.source)continue;
  const recipe=matchFusion(material.unit,anchor.unit,true);if(recipe)pairs.push({recipe,material:material.source,anchor:anchor.source,rank:material.unit.rank});
 }
 const options=pairs.map(pair=>{
 let move=null;
 if(typeof pair.anchor==='number'){
  const anchor=g.get(pair.anchor),p=g.preview(pair.material,anchor.c,anchor.r);
  if(p.ok&&p.type==='fusion')move={source:pair.material,...p};
 }else{
  const p=g.reservePreview(pair.material,pair.anchor);
  if(p.ok)move={source:pair.material,...p};
 }
 return {...pair,move};
 });
 const chosen=p=>p.material===selected||p.anchor===selected;
 return options.find(p=>p.move&&chosen(p))||options.find(p=>p.move)||options.find(chosen)||options[0]||null;
}
