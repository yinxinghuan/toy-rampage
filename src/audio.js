let ctx, enabled = true, voices = 0, lastHit = 0;
export function enableAudio() { try { ctx ||= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume().catch(() => {}); } catch { /* Audio is optional. */ } }
export function toggleSound() { enabled = !enabled; return enabled; }
export function sound(event) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (event === 'hit' && now - lastHit < 0.09) return;
  if (event === 'hit') lastHit = now;
  const notes = event === 'merge' ? [520, 780] : event === 'fusion' ? [440, 660, 880] : event === 'win' ? [523, 659, 784, 1046] : event === 'lose' ? [330, 220, 110] : [event === 'leak' || event === 'invalid' ? 110 : event === 'hit' ? 160 : 460];
  notes.forEach((freq, i) => {
    if (voices >= 6) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), at = now + i * 0.15, duration = notes.length > 1 ? 0.2 : 0.09;
    voices++; o.type = 'triangle'; o.frequency.setValueAtTime(freq, at); o.frequency.exponentialRampToValueAtTime(freq * 0.75, at + duration);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(event === 'hit' ? 0.035 : 0.08, at + 0.006); g.gain.exponentialRampToValueAtTime(0.001, at + duration);
    o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + duration + 0.02); o.onended = () => { voices--; o.disconnect(); g.disconnect(); };
  });
}
