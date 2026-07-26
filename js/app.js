import { ALPHABET, EMOJI_MAP, DIFF, ACHV_LIST, MODES } from './constants.js';
import { createAudioController } from './audio.js';

(function(){
  "use strict";

  /* ---------- State ---------- */
  const state = {
    score:0, best:0, streak:0, sound:true, theme:'light', difficulty:'medium',
    achievements:new Set(), mode:null
  };
  const audio = createAudioController(state);

  const modeGrid = document.getElementById('modeGrid');
  const gameView = document.getElementById('gameView');
  const menuView = document.getElementById('menuView');
  const mascotText = document.getElementById('mascotText');
  const mascotSvg = document.getElementById('mascotSvg');

  function renderMenu(){
    modeGrid.innerHTML = MODES.map(m => `
      <button class="mode-card" data-mode="${m.id}">
        <div class="emoji">${m.emoji}</div>
        <h3>${m.title}</h3>
        <p>${m.desc}</p>
      </button>
    `).join('');
    modeGrid.querySelectorAll('.mode-card').forEach(btn=>{
      btn.addEventListener('click', ()=> startMode(btn.dataset.mode));
    });
  }

  /* ---------- Mascot ---------- */
  function setMascot(msg, mood, useCat){
    mascotText.textContent = msg;
    mascotSvg.innerHTML = `<use href="${useCat ? '#cat-face':'#owl-face'}"/>`;
    mascotSvg.classList.remove('cheer','sad','bob');
    void mascotSvg.offsetWidth;
    mascotSvg.classList.add(mood === 'happy' ? 'cheer' : mood === 'sad' ? 'sad' : 'bob');
  }

  /* ---------- Achievements ---------- */
  function unlock(id){
    if(state.achievements.has(id)) return;
    state.achievements.add(id);
    document.getElementById('achvCount').textContent = state.achievements.size;
    const a = ACHV_LIST[id];
    const toast = document.getElementById('achvToast');
    document.getElementById('achvToastText').textContent = `${a.name} — ${a.desc}`;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'), 2600);
    audio.beep('win');
  }

  /* ---------- Score handling ---------- */
  function addScore(points, won){
    state.score += points;
    if(won){ state.streak++; if(state.streak>=5) unlock('streak5'); }
    else { state.streak = 0; }
    if(state.score > state.best) state.best = state.score;
    updateScoreboard();
  }
  function updateScoreboard(){
    document.getElementById('scoreVal').textContent = state.score;
    document.getElementById('bestVal').textContent = state.best;
    document.getElementById('streakVal').textContent = state.streak;
  }

  function backToMenu(){
    clearActiveTimers();
    gameView.style.display = 'none';
    menuView.style.display = 'block';
    setMascot("Nice round! Pick another mode, or try that one again. 🦉", 'idle');
  }

  let activeTimers = [];
  function clearActiveTimers(){ activeTimers.forEach(t=>clearInterval(t)); activeTimers = []; }

  function panelHeader(title){
    return `<div class="panel-head"><h2 style="margin:0;">${title}</h2><span class="back-link" id="backBtn">← Back to modes</span></div>`;
  }
  function wireBack(){ document.getElementById('backBtn').addEventListener('click', backToMenu); }

  function startMode(id){
    clearActiveTimers();
    menuView.style.display = 'none';
    gameView.style.display = 'block';
    state.mode = id;
    const fns = {classic:modeClassic, timeattack:modeTimeAttack, order:modeOrder, emoji:modeEmoji,
      reverse:modeReverse, scramble:modeScramble, memory:modeMemory, sound:modeSound};
    fns[id]();
  }

  /* ============ CLASSIC MODE ============ */
  function modeClassic(){
    const diff = DIFF[state.difficulty];
    const target = ALPHABET[Math.floor(Math.random()*26)];
    let attemptsLeft = diff.attempts, guesses = 0, hints = [];

    function render(){
      gameView.innerHTML = panelHeader('🎯 Classic Mode') + `
        <p>I'm thinking of a letter from A to Z. Use the hints to narrow it down!</p>
        <div class="attempts-row">${Array.from({length:diff.attempts}).map((_,i)=>
          `<span class="heart ${i<diff.attempts-attemptsLeft?'spent':''}">❤️</span>`).join('')}</div>
        <div class="hint-log" id="hintLog">${hints.map(h=>`<div class="hint-item">${h}</div>`).join('')}</div>
        <div class="letter-grid" id="letterGrid"></div>
      `;
      wireBack();
      const grid = document.getElementById('letterGrid');
      ALPHABET.forEach(L=>{
        const b = document.createElement('button');
        b.className='letter-btn'; b.textContent=L;
        b.addEventListener('click', ()=>guess(L,b));
        grid.appendChild(b);
      });
      document.getElementById('hintLog').scrollTop = 9999;
    }

    function guess(L, btn){
      guesses++;
      if(L === target){
        btn.classList.add('correct');
        [...document.querySelectorAll('.letter-btn')].forEach(b=>b.disabled=true);
        const pts = attemptsLeft * 10;
        addScore(pts, true);
        unlock('first_win');
        if(guesses===1) unlock('perfect');
        setMascot(`You got it — it was ${target}! +${pts} points 🎉`, 'happy');
        audio.beep('win');
        showContinue();
        return;
      }
      btn.classList.add('wrong'); btn.disabled = true;
      attemptsLeft--;
      audio.beep('wrong');
      const diffIdx = ALPHABET.indexOf(L) - ALPHABET.indexOf(target);
      let hint;
      if(Math.abs(diffIdx) === 1) hint = "🔥 So close — just one letter away!";
      else if(diffIdx < 0) hint = `The letter comes after ${L}.`;
      else hint = `The letter comes before ${L}.`;
      hints.push(hint);
      if(attemptsLeft <= 0){
        setMascot(`Out of tries! The letter was ${target}. Try again? 🦉`, 'sad');
        addScore(0, false);
        [...document.querySelectorAll('.letter-btn')].forEach(b=>b.disabled=true);
        showContinue();
        return;
      }
      render();
      setMascot(hint, 'idle');
    }
    function showContinue(){
      const div = document.createElement('div');
      div.style.marginTop='16px';
      div.innerHTML = `<button class="primary-btn" id="again">Play again</button>`;
      gameView.appendChild(div);
      document.getElementById('again').addEventListener('click', modeClassic);
    }
    render();
    setMascot("Pick a letter to guess. I'll tell you if it's higher or lower! 🦉", 'idle');
  }

  /* ============ TIME ATTACK ============ */
  function modeTimeAttack(){
    const diff = DIFF[state.difficulty];
    let timeLeft = diff.timeAttackSecs, correctCount = 0, target = randLetter();
    function randLetter(){ return ALPHABET[Math.floor(Math.random()*26)]; }

    function render(){
      const pct = Math.max(0, (timeLeft/diff.timeAttackSecs)*100);
      gameView.innerHTML = panelHeader('⏱️ Time Attack') + `
        <p>Guess the letter shown as a range hint — as fast as you can!</p>
        <div class="timer-bar-outer"><div class="timer-bar-inner" style="width:${pct}%"></div></div>
        <p id="ttLabel" style="font-weight:800;">⏳ ${timeLeft}s &nbsp;|&nbsp; ✅ Correct: ${correctCount}</p>
        <div class="hint-item" id="ttHint">Comes after ${prevLetter(target,3)} and before ${nextLetter(target,3)}</div>
        <div class="letter-grid" id="letterGrid"></div>
      `;
      wireBack();
      const grid = document.getElementById('letterGrid');
      ALPHABET.forEach(L=>{
        const b = document.createElement('button');
        b.className='letter-btn'; b.textContent=L;
        b.addEventListener('click', ()=>guess(L,b));
        grid.appendChild(b);
      });
    }
    function prevLetter(L,n){ let i = Math.max(0, ALPHABET.indexOf(L)-n); return ALPHABET[i]; }
    function nextLetter(L,n){ let i = Math.min(25, ALPHABET.indexOf(L)+n); return ALPHABET[i]; }

    function guess(L, btn){
      if(L === target){
        correctCount++;
        addScore(5, true);
        audio.beep('correct');
        setMascot("Yes! Keep going! ⚡", 'happy');
      } else {
        audio.beep('wrong');
        setMascot("Nope, try the next one!", 'sad');
      }
      target = randLetter();
      render();
    }
    render();
    const timer = setInterval(()=>{
      timeLeft--;
      if(timeLeft<=0){
        clearInterval(timer);
        endRound();
        return;
      }
      const bar = document.querySelector('.timer-bar-inner');
      if(bar) bar.style.width = Math.max(0,(timeLeft/diff.timeAttackSecs)*100) + '%';
      const label = document.getElementById('ttLabel');
      if(label) label.textContent = `⏳ ${timeLeft}s  |  ✅ Correct: ${correctCount}`;
    },1000);
    activeTimers.push(timer);

    function endRound(){
      if(correctCount>=10) unlock('speedy');
      setMascot(`Time's up! You got ${correctCount} correct. Score added! ⏱️`, correctCount>0?'happy':'sad');
      gameView.innerHTML = panelHeader('⏱️ Time Attack — Results') + `
        <div class="big-emoji">${correctCount>=10?'🏆':'⌛'}</div>
        <p style="text-align:center;font-weight:800;font-size:1.2rem;">You guessed ${correctCount} letters correctly!</p>
        <div style="text-align:center;"><button class="primary-btn" id="again">Play again</button></div>
      `;
      wireBack();
      document.getElementById('again').addEventListener('click', modeTimeAttack);
    }
    setMascot("Quick! Guess letters as fast as you can before time runs out!", 'idle');
  }

  /* ============ ALPHABET ORDER ============ */
  function modeOrder(){
    const len = 6;
    const start = Math.floor(Math.random()*(26-len));
    const seq = ALPHABET.slice(start, start+len);
    const blankIdx = 1 + Math.floor(Math.random()*(len-2));
    const answer = seq[blankIdx];

    gameView.innerHTML = panelHeader('🔤 Alphabet Order') + `
      <p>What letter is missing from this sequence?</p>
      <div class="sequence-row">
        ${seq.map((L,i)=> i===blankIdx ? `<div class="seq-tile blank">?</div>` : `<div class="seq-tile">${L}</div>`).join('')}
      </div>
      <div class="letter-grid" id="letterGrid"></div>
    `;
    wireBack();
    const grid = document.getElementById('letterGrid');
    const options = new Set([answer]);
    while(options.size < 6){ options.add(ALPHABET[Math.floor(Math.random()*26)]); }
    [...options].sort(()=>Math.random()-0.5).forEach(L=>{
      const b = document.createElement('button');
      b.className='letter-btn'; b.textContent=L;
      b.addEventListener('click', ()=>{
        [...grid.children].forEach(x=>x.disabled=true);
        if(L===answer){
          b.classList.add('correct'); addScore(10,true); unlock('first_win');
          setMascot(`Correct — ${answer} fits right in! 🎉`, 'happy'); audio.beep('win');
        } else {
          b.classList.add('wrong'); addScore(0,false);
          setMascot(`Not quite, it was ${answer}.`, 'sad'); audio.beep('wrong');
        }
        addContinue(modeOrder);
      });
      grid.appendChild(b);
    });
    setMascot("Find the letter that slots perfectly into the sequence!", 'idle');
  }
  function addContinue(fn){
    const div = document.createElement('div');
    div.style.marginTop='16px';
    div.innerHTML = `<button class="primary-btn" id="again">Next round</button>`;
    gameView.appendChild(div);
    document.getElementById('again').addEventListener('click', fn);
  }

  /* ============ EMOJI HINT MODE ============ */
  let emojiProgress = new Set();
  function modeEmoji(){
    const remaining = ALPHABET.filter(L=>!emojiProgress.has(L));
    const pool = remaining.length ? remaining : ALPHABET;
    const target = pool[Math.floor(Math.random()*pool.length)];
    gameView.innerHTML = panelHeader('🍎 Emoji Hint Mode') + `
      <p>Which letter does this picture start with? (${emojiProgress.size}/26 learned)</p>
      <div class="big-emoji">${EMOJI_MAP[target]}</div>
      <div class="letter-grid" id="letterGrid"></div>
    `;
    wireBack();
    const grid = document.getElementById('letterGrid');
    ALPHABET.forEach(L=>{
      const b = document.createElement('button');
      b.className='letter-btn'; b.textContent=L;
      b.addEventListener('click', ()=>{
        [...grid.children].forEach(x=>x.disabled=true);
        if(L===target){
          b.classList.add('correct'); addScore(8,true); emojiProgress.add(target);
          unlock('first_win');
          if(emojiProgress.size>=26) unlock('alphabet_master');
          setMascot(`Yes! ${EMOJI_MAP[target]} starts with ${target}!`, 'happy', true); audio.beep('win');
        } else {
          b.classList.add('wrong'); addScore(0,false);
          setMascot(`It was ${target}, for ${EMOJI_MAP[target]}.`, 'sad', true); audio.beep('wrong');
        }
        addContinue(modeEmoji);
      });
      grid.appendChild(b);
    });
    setMascot("Squibb the cat loves this one — match the picture to its letter!", 'idle', true);
  }

  /* ============ REVERSE GUESS ============ */
  function modeReverse(){
    const idx = 1 + Math.floor(Math.random()*24);
    const target = ALPHABET[idx];
    const before = ALPHABET[idx-1], after = ALPHABET[idx+1];
    gameView.innerHTML = panelHeader('↔️ Reverse Guess') + `
      <div class="hint-item" style="font-size:1rem; text-align:center;">
        "This letter comes after <b>${before}</b> and before <b>${after}</b>."
      </div>
      <div class="letter-grid" id="letterGrid" style="margin-top:16px;"></div>
    `;
    wireBack();
    const grid = document.getElementById('letterGrid');
    const options = new Set([target]);
    while(options.size<6){ options.add(ALPHABET[Math.floor(Math.random()*26)]); }
    [...options].sort(()=>Math.random()-0.5).forEach(L=>{
      const b = document.createElement('button');
      b.className='letter-btn'; b.textContent=L;
      b.addEventListener('click', ()=>{
        [...grid.children].forEach(x=>x.disabled=true);
        if(L===target){
          b.classList.add('correct'); addScore(10,true); unlock('first_win');
          setMascot(`Exactly right — ${target}! 🎉`, 'happy'); audio.beep('win');
        } else {
          b.classList.add('wrong'); addScore(0,false);
          setMascot(`Close! The answer was ${target}.`, 'sad'); audio.beep('wrong');
        }
        addContinue(modeReverse);
      });
      grid.appendChild(b);
    });
    setMascot("Work out which letter fits between the two clues!", 'idle');
  }

  /* ============ SCRAMBLE MODE ============ */
  function modeScramble(){
    const start = Math.floor(Math.random()*24);
    const correctOrder = [ALPHABET[start], ALPHABET[start+1], ALPHABET[start+2]];
    let shuffled = [...correctOrder].sort(()=>Math.random()-0.5);
    if(shuffled.join('')===correctOrder.join('')) shuffled.reverse();
    let picked = [];

    function render(){
      gameView.innerHTML = panelHeader('🔀 Scramble Mode') + `
        <p>Tap the letters in alphabetical order.</p>
        <div class="sequence-row">${picked.map(L=>`<div class="seq-tile">${L}</div>`).join('')}${
          Array.from({length:3-picked.length}).map(()=>`<div class="seq-tile blank">?</div>`).join('')}</div>
        <div class="sequence-row" id="tileRow">
          ${shuffled.map((L,i)=>`<button class="seq-tile" data-i="${i}" style="cursor:pointer;" ${picked.includes(L)?'disabled':''}>${L}</button>`).join('')}
        </div>
      `;
      wireBack();
      document.querySelectorAll('#tileRow button:not(:disabled)').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const L = btn.textContent;
          picked.push(L);
          btn.disabled = true;
          if(picked.length===3){
            if(picked.join('')===correctOrder.join('')){
              addScore(12,true); unlock('first_win');
              setMascot(`Perfect order: ${correctOrder.join(' ')} 🎉`, 'happy'); audio.beep('win');
            } else {
              addScore(0,false);
              setMascot(`Not quite — correct order was ${correctOrder.join(' ')}.`, 'sad'); audio.beep('wrong');
            }
            setTimeout(()=>addContinue(modeScramble), 50);
          }
          render_partial();
        });
      });
    }
    function render_partial(){
      document.querySelector('.sequence-row').innerHTML =
        picked.map(L=>`<div class="seq-tile">${L}</div>`).join('') +
        Array.from({length:3-picked.length}).map(()=>`<div class="seq-tile blank">?</div>`).join('');
    }
    render();
    setMascot("Three letters, all mixed up — put them back in order!", 'idle');
  }

  /* ============ MEMORY MODE ============ */
  function modeMemory(){
    const diff = DIFF[state.difficulty];
    const startIdx = Math.floor(Math.random()*(26-diff.memoryLen));
    const sequence = ALPHABET.slice(startIdx, startIdx+diff.memoryLen);
    let typed = [];

    gameView.innerHTML = panelHeader('🧠 Memory Mode') + `
      <p>Memorize this sequence — it will disappear in a few seconds!</p>
      <div class="sequence-row" id="seqRow">${sequence.map(L=>`<div class="seq-tile">${L}</div>`).join('')}</div>
    `;
    wireBack();
    setMascot("Look closely and remember the order!", 'idle');

    const t = setTimeout(()=>{
      document.getElementById('seqRow').innerHTML = sequence.map(()=>`<div class="seq-tile hidden-mem">?</div>`).join('');
      renderInput();
      setMascot("Now type the sequence back, in order!", 'idle');
    }, diff.memoryShow);
    activeTimers.push(t);

    function renderInput(){
      const grid = document.createElement('div');
      grid.className = 'letter-grid';
      grid.id = 'letterGrid';
      gameView.appendChild(grid);
      const progress = document.createElement('div');
      progress.className='sequence-row'; progress.id='progRow';
      progress.style.marginTop='14px';
      gameView.insertBefore(progress, grid);
      updateProgress();
      ALPHABET.forEach(L=>{
        const b = document.createElement('button');
        b.className='letter-btn'; b.textContent=L;
        b.addEventListener('click', ()=>{
          typed.push(L);
          const isRight = sequence[typed.length-1] === L;
          b.classList.add(isRight?'correct':'wrong');
          updateProgress();
          if(typed.length === sequence.length){
            const allRight = typed.join('') === sequence.join('');
            [...grid.children].forEach(x=>x.disabled=true);
            if(allRight){
              addScore(sequence.length*8, true); unlock('first_win');
              if(state.difficulty==='hard') unlock('memory_king');
              setMascot(`Flawless memory! ${sequence.join('')} 🎉`, 'happy'); audio.beep('win');
            } else {
              addScore(0,false);
              setMascot(`So close — it was ${sequence.join('')}.`, 'sad'); audio.beep('wrong');
            }
            addContinue(modeMemory);
          }
        });
        grid.appendChild(b);
      });
    }
    function updateProgress(){
      const p = document.getElementById('progRow');
      if(!p) return;
      p.innerHTML = sequence.map((_,i)=> i<typed.length ? `<div class="seq-tile">${typed[i]}</div>` : `<div class="seq-tile blank">?</div>`).join('');
    }
  }

  /* ============ SOUND MODE ============ */
  function modeSound(){
    const target = ALPHABET[Math.floor(Math.random()*26)];
    gameView.innerHTML = panelHeader('🔊 Sound Mode') + `
      <p>Listen carefully, then pick the letter you heard.</p>
      <div style="text-align:center;margin:16px 0;">
        <button class="primary-btn secondary" id="playBtn">🔊 Play letter</button>
      </div>
      <div class="letter-grid" id="letterGrid"></div>
    `;
    wireBack();
    document.getElementById('playBtn').addEventListener('click', ()=>audio.speak(target));
    audio.speak(target);
    const grid = document.getElementById('letterGrid');
    ALPHABET.forEach(L=>{
      const b = document.createElement('button');
      b.className='letter-btn'; b.textContent=L;
      b.addEventListener('click', ()=>{
        [...grid.children].forEach(x=>x.disabled=true);
        if(L===target){
          b.classList.add('correct'); addScore(8,true); unlock('first_win');
          setMascot(`Yes, that was ${target}! Great ears! 🎉`, 'happy'); audio.beep('win');
        } else {
          b.classList.add('wrong'); addScore(0,false);
          setMascot(`It was ${target}. Listen again next time!`, 'sad'); audio.beep('wrong');
        }
        addContinue(modeSound);
      });
      grid.appendChild(b);
    });
    setMascot("Hit play, then tap the letter you think you heard!", 'idle');
    if(!('speechSynthesis' in window)){
      setMascot("Your browser doesn't support text-to-speech, but you can still guess!", 'idle');
    }
  }

  /* ---------- Top controls ---------- */
  document.getElementById('themeToggle').addEventListener('click', ()=>{
    state.theme = state.theme==='light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', state.theme);
    document.getElementById('themeToggle').textContent = state.theme==='light' ? '🌙 Dark' : '☀️ Light';
  });
  document.getElementById('soundToggle').addEventListener('click', (e)=>{
    state.sound = !state.sound;
    e.target.textContent = state.sound ? '🔊 Sound' : '🔇 Muted';
  });
  document.getElementById('difficultySelect').addEventListener('change', (e)=>{
    state.difficulty = e.target.value;
  });

  renderMenu();
  updateScoreboard();
})();
