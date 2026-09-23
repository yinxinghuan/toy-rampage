// Compare ground contacts in one world coordinate system, never sprite bounds.
// Separate tie slots keep an enemy in front when contacts exactly coincide.
export function sceneDepth(groundY,worldHeight,enemy=false){
 return 100+Math.round(groundY/Math.max(1,worldHeight)*10000)*2+(enemy?1:0);
}
