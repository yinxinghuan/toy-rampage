// Masks are shared by rules, sprites and previews: an L's missing cell is empty.
export const LAND_SHAPES={plot4:[[0,0],[1,0],[0,1],[1,1]],plot1:[[0,0]],plot2:[[0,0],[1,0]],plotV2:[[0,0],[0,1]],plot3:[[0,0],[1,0],[2,0]],plotV3:[[0,0],[0,1],[0,2]],plotL0:[[0,0],[0,1],[1,1]],plotL1:[[0,0],[1,0],[0,1]],plotL2:[[0,0],[1,0],[1,1]],plotL3:[[1,0],[0,1],[1,1]]};
export const LAND_BOUNDS=Object.fromEntries(Object.entries(LAND_SHAPES).map(([k,a])=>[k,[Math.max(...a.map(p=>p[0]))+1,Math.max(...a.map(p=>p[1]))+1]]));
