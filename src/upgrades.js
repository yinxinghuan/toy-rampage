export const XP_THRESHOLDS=[6,20,40,70,110,160];
export const UPGRADES=[
 {id:'rivet-duration',kind:'rivet',effect:'duration'},
 {id:'arc-chain',kind:'arc',effect:'chain'},
 {id:'spring-bounce',kind:'spring',effect:'bounce'},
 {id:'rail-pierce',kind:'rail',effect:'pierce'},
 {id:'mortar-radius',kind:'mortar',effect:'radius'},
 {id:'bubble-splash',kind:'bubble',effect:'splash'},
 {id:'drum-boost',kind:'drum',effect:'boost'},
 ...['spring','rail','mortar','bubble'].map(kind=>({id:kind+'-speed',kind,effect:'speed'})),
 {id:'supplies',effect:'supplies'},
 {id:'repair',effect:'repair'},
];
