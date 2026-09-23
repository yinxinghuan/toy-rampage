import {adjacent} from '../engine.js';

// Match Workshop.drumBoost: strongest common-edge drum, not diagonal or additive.
export function supportLinks(game){
 return game.units.filter(u=>u.kind!=='drum').flatMap(u=>{
  const drums=game.units.filter(d=>d.kind==='drum'&&adjacent(d,u)).sort((a,b)=>b.rank-a.rank);
  return drums.length?[{sourceId:drums[0].id,targetId:u.id,boost:game.drumBoost(u)}]:[];
 });
}
