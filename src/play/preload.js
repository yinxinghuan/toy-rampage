// Count decoded assets, not guessed network bytes. Queue waits do not consume timeouts.
export function createPreloader({total,onProgress,concurrency=6,timeout=25000}){
 let completed=0,active=0,closed=false;const queue=[],controllers=new Set();
 const pump=()=>{while(!closed&&active<concurrency&&queue.length){const {task,resolve,reject}=queue.shift();active++;const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),timeout);
  Promise.resolve().then(()=>{if(controller.signal.aborted)throw new Error('Preload cancelled');return task(controller.signal);}).then(value=>{completed++;if(!closed)onProgress({completed,total});resolve(value);},reject).finally(()=>{clearTimeout(timer);controllers.delete(controller);active--;pump();});
 }};
 const run=task=>new Promise((resolve,reject)=>{if(closed){reject(new Error('Preload cancelled'));return;}queue.push({task,resolve,reject});pump();});
 return{
  run,
  image:url=>run(signal=>new Promise((resolve,reject)=>{const i=new Image();let done=false;const finish=(error)=>{if(done)return;done=true;signal.removeEventListener('abort',abort);error?reject(error):resolve(i);};const abort=()=>{i.src='';finish(new Error('Image load timed out'));};signal.addEventListener('abort',abort,{once:true});i.src=url;i.decode().then(()=>finish(),error=>finish(error));})),
  readJSON:url=>run(async signal=>{const response=await fetch(url,{signal});if(!response.ok)throw new Error('Asset manifest unavailable');return response.json();}),
  cancel(){closed=true;for(const c of controllers)c.abort();for(const t of queue.splice(0))t.reject(new Error('Preload cancelled'));},
 };
}
