export function createAudioController(state){
  let actx;

  function beep(type){
    if(!state.sound) return;
    try{
      actx = actx || new (window.AudioContext||window.webkitAudioContext)();
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      const freqs = {correct:[660,880], wrong:[220,140], tick:[440], win:[523,659,784]};
      const seq = freqs[type]||[440];
      let t = actx.currentTime;
      seq.forEach((f,i)=>{
        o.frequency.setValueAtTime(f, t + i*0.11);
      });
      o.type = type==='wrong' ? 'sawtooth' : 'sine';
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + seq.length*0.11 + 0.15);
      o.start(t); o.stop(t + seq.length*0.11 + 0.2);
    }catch(e){/* audio not available, ignore */}
  }

  function speak(letter){
    if(!state.sound) return;
    try{
      const u = new SpeechSynthesisUtterance(letter);
      u.rate = 0.85; u.pitch = 1.1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }catch(e){/* tts not available */}
  }

  return { beep, speak };
}
