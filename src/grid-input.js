// Hysteresis holds the current cell near a shared edge; never searches for
// another legal placement or changes the intended footprint.
export function snapGridAxis(value,previous,tolerance=4/45){
 if(Number.isInteger(previous)&&value>=previous-tolerance&&value<previous+1+tolerance)return previous;
 return Math.floor(value);
}
