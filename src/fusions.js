// Shared recipe contracts. Rendering, placement and upgrade eligibility must
// consume the same identities; a recipe is not permission to ignore its shape.
export const FUSIONS=[
 {kind:'fusion',material:'spring',anchor:'rail',rank:3,resultRank:4,footprint:[3,1],
  inherits:['spring-bounce','rail-pierce','spring-speed','rail-speed']},
 {kind:'frost',material:'spring',anchor:'bubble',rank:2,resultRank:3,footprint:[2,2],
  inherits:['bubble-splash','bubble-speed','spring-speed']},
 {kind:'storm',material:'rail',anchor:'arc',rank:2,resultRank:3,footprint:[3,2],
  inherits:['arc-chain','rail-speed']},
];
export const fusionRecipe=kind=>FUSIONS.find(r=>r.kind===kind);
export const fusionRankAllowed=(recipe,rank)=>rank===recipe.rank||(recipe.kind!=='fusion'&&rank===3);
export function matchFusion(source,target,sourceOnBoard){
 if(!source||!target)return null;
 return FUSIONS.find(r=>source.rank===target.rank&&fusionRankAllowed(r,source.rank)&&(
  source.kind===r.material&&target.kind===r.anchor||
  sourceOnBoard&&source.kind===r.anchor&&target.kind===r.material
 ))||null;
}
export function fusionInherits(kind,upgrade){return Boolean(fusionRecipe(kind)?.inherits.includes(upgrade));}
