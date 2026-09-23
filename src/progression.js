// One schedule for supply, expansion and the player-facing handbook.
export const SUPPLY_UNLOCKS=[{kind:'bubble',afterWave:1},{kind:'drum',afterWave:3}];
export const LAND_REWARDS=[1,2,3,4,5,6];
export const landReward=wave=>[0,3,4,4,4,6,6][wave]||0;
export const HIGH_TIER_AFTER=4;
export function supplyPool(level,wave){return (level.experiment?[level.experiment,'spring','rail']:['spring','rail','mortar']).concat(SUPPLY_UNLOCKS.filter(x=>wave>=x.afterWave).map(x=>x.kind));}
export function chapterRoutes(index){return index>=5?['fusion','frost','storm']:index>=3?['fusion','frost']:['fusion'];}
