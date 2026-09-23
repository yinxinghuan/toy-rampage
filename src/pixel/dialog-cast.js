export const CAST_POOLS={win:['win','win-bubble','win-rail'],lose:['lose','lose-drum','lose-scout'],upgrade:['upgrade']};
// One shuffled bag per outcome; no repeats within a bag or at the bag boundary.
export function createCastPicker(pools=CAST_POOLS,rng=Math.random){
 const bags=new Map(),last=new Map();
 return kind=>{
  const pool=pools[kind];if(!pool?.length)return null;
  let bag=bags.get(kind);
  if(!bag?.length){
   bag=[...pool];for(let i=bag.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag.length>1&&bag[0]===last.get(kind))[bag[0],bag[1]]=[bag[1],bag[0]];
   bags.set(kind,bag);
  }
  const value=bag.shift();last.set(kind,value);return value;
 };
}
