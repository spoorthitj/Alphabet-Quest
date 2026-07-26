(() => {
  // js/constants.js
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var EMOJI_MAP = {
    A: "\u{1F34E}",
    B: "\u{1F43B}",
    C: "\u{1F431}",
    D: "\u{1F436}",
    E: "\u{1F95A}",
    F: "\u{1F438}",
    G: "\u{1F347}",
    H: "\u{1F3E0}",
    I: "\u{1F366}",
    J: "\u{1F9C3}",
    K: "\u{1FA81}",
    L: "\u{1F981}",
    M: "\u{1F435}",
    N: "\u{1F95C}",
    O: "\u{1F419}",
    P: "\u{1F427}",
    Q: "\u{1F478}",
    R: "\u{1F308}",
    S: "\u2B50",
    T: "\u{1F42F}",
    U: "\u2602\uFE0F",
    V: "\u{1F30B}",
    W: "\u{1F349}",
    X: "\u{1FA7B}",
    Y: "\u{1F9F6}",
    Z: "\u{1F993}"
  };
  var DIFF = {
    easy: { attempts: 7, timeAttackSecs: 75, memoryLen: 4, memoryShow: 4500 },
    medium: { attempts: 5, timeAttackSecs: 60, memoryLen: 5, memoryShow: 3e3 },
    hard: { attempts: 3, timeAttackSecs: 45, memoryLen: 6, memoryShow: 2e3 }
  };
  var ACHV_LIST = {
    first_win: { name: "First Flight", desc: "Win your first round", icon: "\u{1F423}" },
    streak5: { name: "Hot Streak", desc: "5 wins in a row", icon: "\u{1F525}" },
    alphabet_master: { name: "Alphabet Master", desc: "Clear Emoji Hint Mode fully", icon: "\u{1F393}" },
    speedy: { name: "Speed Demon", desc: "Score 10+ in Time Attack", icon: "\u26A1" },
    memory_king: { name: "Memory Master", desc: "Win Memory Mode on Hard", icon: "\u{1F9E0}" },
    perfect: { name: "Perfectionist", desc: "Win Classic Mode on the first guess", icon: "\u{1F48E}" }
  };
  var MODES = [
    { id: "classic", emoji: "\u{1F3AF}", title: "Classic Mode", desc: "Guess the hidden letter in the fewest tries." },
    { id: "timeattack", emoji: "\u23F1\uFE0F", title: "Time Attack", desc: "Guess as many letters as you can in 60 seconds." },
    { id: "order", emoji: "\u{1F524}", title: "Alphabet Order", desc: "Fill in the missing letter in a sequence." },
    { id: "emoji", emoji: "\u{1F34E}", title: "Emoji Hint Mode", desc: "Match the emoji to its letter. Great for kids!" },
    { id: "reverse", emoji: "\u2194\uFE0F", title: "Reverse Guess", desc: '"Comes after H, before J." What letter is it?' },
    { id: "scramble", emoji: "\u{1F500}", title: "Scramble Mode", desc: "Arrange jumbled letters into alphabetical order." },
    { id: "memory", emoji: "\u{1F9E0}", title: "Memory Mode", desc: "Memorize the sequence, then type it back." },
    { id: "sound", emoji: "\u{1F50A}", title: "Sound Mode", desc: "Hear a letter spoken aloud, then pick it." }
  ];

  // js/audio.js
  function createAudioController(state) {
    let actx;
    function beep(type) {
      if (!state.sound) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.connect(g);
        g.connect(actx.destination);
        const freqs = { correct: [660, 880], wrong: [220, 140], tick: [440], win: [523, 659, 784] };
        const seq = freqs[type] || [440];
        let t = actx.currentTime;
        seq.forEach((f, i) => {
          o.frequency.setValueAtTime(f, t + i * 0.11);
        });
        o.type = type === "wrong" ? "sawtooth" : "sine";
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(1e-3, t + seq.length * 0.11 + 0.15);
        o.start(t);
        o.stop(t + seq.length * 0.11 + 0.2);
      } catch (e) {
      }
    }
    function speak(letter) {
      if (!state.sound) return;
      try {
        const u = new SpeechSynthesisUtterance(letter);
        u.rate = 0.85;
        u.pitch = 1.1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) {
      }
    }
    return { beep, speak };
  }

  // js/app.js
  (function() {
    "use strict";
    const state = {
      score: 0,
      best: 0,
      streak: 0,
      sound: true,
      theme: "light",
      difficulty: "medium",
      achievements: /* @__PURE__ */ new Set(),
      mode: null
    };
    const audio = createAudioController(state);
    const modeGrid = document.getElementById("modeGrid");
    const gameView = document.getElementById("gameView");
    const menuView = document.getElementById("menuView");
    const mascotText = document.getElementById("mascotText");
    const mascotSvg = document.getElementById("mascotSvg");
    function renderMenu() {
      modeGrid.innerHTML = MODES.map((m) => `
      <button class="mode-card" data-mode="${m.id}">
        <div class="emoji">${m.emoji}</div>
        <h3>${m.title}</h3>
        <p>${m.desc}</p>
      </button>
    `).join("");
      modeGrid.querySelectorAll(".mode-card").forEach((btn) => {
        btn.addEventListener("click", () => startMode(btn.dataset.mode));
      });
    }
    function setMascot(msg, mood, useCat) {
      mascotText.textContent = msg;
      mascotSvg.innerHTML = `<use href="${useCat ? "#cat-face" : "#owl-face"}"/>`;
      mascotSvg.classList.remove("cheer", "sad", "bob");
      void mascotSvg.offsetWidth;
      mascotSvg.classList.add(mood === "happy" ? "cheer" : mood === "sad" ? "sad" : "bob");
    }
    function unlock(id) {
      if (state.achievements.has(id)) return;
      state.achievements.add(id);
      document.getElementById("achvCount").textContent = state.achievements.size;
      const a = ACHV_LIST[id];
      const toast = document.getElementById("achvToast");
      document.getElementById("achvToastText").textContent = `${a.name} \u2014 ${a.desc}`;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2600);
      audio.beep("win");
    }
    function addScore(points, won) {
      state.score += points;
      if (won) {
        state.streak++;
        if (state.streak >= 5) unlock("streak5");
      } else {
        state.streak = 0;
      }
      if (state.score > state.best) state.best = state.score;
      updateScoreboard();
    }
    function updateScoreboard() {
      document.getElementById("scoreVal").textContent = state.score;
      document.getElementById("bestVal").textContent = state.best;
      document.getElementById("streakVal").textContent = state.streak;
    }
    function backToMenu() {
      clearActiveTimers();
      gameView.style.display = "none";
      menuView.style.display = "block";
      setMascot("Nice round! Pick another mode, or try that one again. \u{1F989}", "idle");
    }
    let activeTimers = [];
    function clearActiveTimers() {
      activeTimers.forEach((t) => clearInterval(t));
      activeTimers = [];
    }
    function panelHeader(title) {
      return `<div class="panel-head"><h2 style="margin:0;">${title}</h2><span class="back-link" id="backBtn">\u2190 Back to modes</span></div>`;
    }
    function wireBack() {
      document.getElementById("backBtn").addEventListener("click", backToMenu);
    }
    function startMode(id) {
      clearActiveTimers();
      menuView.style.display = "none";
      gameView.style.display = "block";
      state.mode = id;
      const fns = {
        classic: modeClassic,
        timeattack: modeTimeAttack,
        order: modeOrder,
        emoji: modeEmoji,
        reverse: modeReverse,
        scramble: modeScramble,
        memory: modeMemory,
        sound: modeSound
      };
      fns[id]();
    }
    function modeClassic() {
      const diff = DIFF[state.difficulty];
      const target = ALPHABET[Math.floor(Math.random() * 26)];
      let attemptsLeft = diff.attempts, guesses = 0, hints = [];
      function render() {
        gameView.innerHTML = panelHeader("\u{1F3AF} Classic Mode") + `
        <p>I'm thinking of a letter from A to Z. Use the hints to narrow it down!</p>
        <div class="attempts-row">${Array.from({ length: diff.attempts }).map((_, i) => `<span class="heart ${i < diff.attempts - attemptsLeft ? "spent" : ""}">\u2764\uFE0F</span>`).join("")}</div>
        <div class="hint-log" id="hintLog">${hints.map((h) => `<div class="hint-item">${h}</div>`).join("")}</div>
        <div class="letter-grid" id="letterGrid"></div>
      `;
        wireBack();
        const grid = document.getElementById("letterGrid");
        ALPHABET.forEach((L) => {
          const b = document.createElement("button");
          b.className = "letter-btn";
          b.textContent = L;
          b.addEventListener("click", () => guess(L, b));
          grid.appendChild(b);
        });
        document.getElementById("hintLog").scrollTop = 9999;
      }
      function guess(L, btn) {
        guesses++;
        if (L === target) {
          btn.classList.add("correct");
          [...document.querySelectorAll(".letter-btn")].forEach((b) => b.disabled = true);
          const pts = attemptsLeft * 10;
          addScore(pts, true);
          unlock("first_win");
          if (guesses === 1) unlock("perfect");
          setMascot(`You got it \u2014 it was ${target}! +${pts} points \u{1F389}`, "happy");
          audio.beep("win");
          showContinue();
          return;
        }
        btn.classList.add("wrong");
        btn.disabled = true;
        attemptsLeft--;
        audio.beep("wrong");
        const diffIdx = ALPHABET.indexOf(L) - ALPHABET.indexOf(target);
        let hint;
        if (Math.abs(diffIdx) === 1) hint = "\u{1F525} So close \u2014 just one letter away!";
        else if (diffIdx < 0) hint = `The letter comes after ${L}.`;
        else hint = `The letter comes before ${L}.`;
        hints.push(hint);
        if (attemptsLeft <= 0) {
          setMascot(`Out of tries! The letter was ${target}. Try again? \u{1F989}`, "sad");
          addScore(0, false);
          [...document.querySelectorAll(".letter-btn")].forEach((b) => b.disabled = true);
          showContinue();
          return;
        }
        render();
        setMascot(hint, "idle");
      }
      function showContinue() {
        const div = document.createElement("div");
        div.style.marginTop = "16px";
        div.innerHTML = `<button class="primary-btn" id="again">Play again</button>`;
        gameView.appendChild(div);
        document.getElementById("again").addEventListener("click", modeClassic);
      }
      render();
      setMascot("Pick a letter to guess. I'll tell you if it's higher or lower! \u{1F989}", "idle");
    }
    function modeTimeAttack() {
      const diff = DIFF[state.difficulty];
      let timeLeft = diff.timeAttackSecs, correctCount = 0, target = randLetter();
      function randLetter() {
        return ALPHABET[Math.floor(Math.random() * 26)];
      }
      function render() {
        const pct = Math.max(0, timeLeft / diff.timeAttackSecs * 100);
        gameView.innerHTML = panelHeader("\u23F1\uFE0F Time Attack") + `
        <p>Guess the letter shown as a range hint \u2014 as fast as you can!</p>
        <div class="timer-bar-outer"><div class="timer-bar-inner" style="width:${pct}%"></div></div>
        <p id="ttLabel" style="font-weight:800;">\u23F3 ${timeLeft}s &nbsp;|&nbsp; \u2705 Correct: ${correctCount}</p>
        <div class="hint-item" id="ttHint">Comes after ${prevLetter(target, 3)} and before ${nextLetter(target, 3)}</div>
        <div class="letter-grid" id="letterGrid"></div>
      `;
        wireBack();
        const grid = document.getElementById("letterGrid");
        ALPHABET.forEach((L) => {
          const b = document.createElement("button");
          b.className = "letter-btn";
          b.textContent = L;
          b.addEventListener("click", () => guess(L, b));
          grid.appendChild(b);
        });
      }
      function prevLetter(L, n) {
        let i = Math.max(0, ALPHABET.indexOf(L) - n);
        return ALPHABET[i];
      }
      function nextLetter(L, n) {
        let i = Math.min(25, ALPHABET.indexOf(L) + n);
        return ALPHABET[i];
      }
      function guess(L, btn) {
        if (L === target) {
          correctCount++;
          addScore(5, true);
          audio.beep("correct");
          setMascot("Yes! Keep going! \u26A1", "happy");
        } else {
          audio.beep("wrong");
          setMascot("Nope, try the next one!", "sad");
        }
        target = randLetter();
        render();
      }
      render();
      const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(timer);
          endRound();
          return;
        }
        const bar = document.querySelector(".timer-bar-inner");
        if (bar) bar.style.width = Math.max(0, timeLeft / diff.timeAttackSecs * 100) + "%";
        const label = document.getElementById("ttLabel");
        if (label) label.textContent = `\u23F3 ${timeLeft}s  |  \u2705 Correct: ${correctCount}`;
      }, 1e3);
      activeTimers.push(timer);
      function endRound() {
        if (correctCount >= 10) unlock("speedy");
        setMascot(`Time's up! You got ${correctCount} correct. Score added! \u23F1\uFE0F`, correctCount > 0 ? "happy" : "sad");
        gameView.innerHTML = panelHeader("\u23F1\uFE0F Time Attack \u2014 Results") + `
        <div class="big-emoji">${correctCount >= 10 ? "\u{1F3C6}" : "\u231B"}</div>
        <p style="text-align:center;font-weight:800;font-size:1.2rem;">You guessed ${correctCount} letters correctly!</p>
        <div style="text-align:center;"><button class="primary-btn" id="again">Play again</button></div>
      `;
        wireBack();
        document.getElementById("again").addEventListener("click", modeTimeAttack);
      }
      setMascot("Quick! Guess letters as fast as you can before time runs out!", "idle");
    }
    function modeOrder() {
      const len = 6;
      const start = Math.floor(Math.random() * (26 - len));
      const seq = ALPHABET.slice(start, start + len);
      const blankIdx = 1 + Math.floor(Math.random() * (len - 2));
      const answer = seq[blankIdx];
      gameView.innerHTML = panelHeader("\u{1F524} Alphabet Order") + `
      <p>What letter is missing from this sequence?</p>
      <div class="sequence-row">
        ${seq.map((L, i) => i === blankIdx ? `<div class="seq-tile blank">?</div>` : `<div class="seq-tile">${L}</div>`).join("")}
      </div>
      <div class="letter-grid" id="letterGrid"></div>
    `;
      wireBack();
      const grid = document.getElementById("letterGrid");
      const options = /* @__PURE__ */ new Set([answer]);
      while (options.size < 6) {
        options.add(ALPHABET[Math.floor(Math.random() * 26)]);
      }
      [...options].sort(() => Math.random() - 0.5).forEach((L) => {
        const b = document.createElement("button");
        b.className = "letter-btn";
        b.textContent = L;
        b.addEventListener("click", () => {
          [...grid.children].forEach((x) => x.disabled = true);
          if (L === answer) {
            b.classList.add("correct");
            addScore(10, true);
            unlock("first_win");
            setMascot(`Correct \u2014 ${answer} fits right in! \u{1F389}`, "happy");
            audio.beep("win");
          } else {
            b.classList.add("wrong");
            addScore(0, false);
            setMascot(`Not quite, it was ${answer}.`, "sad");
            audio.beep("wrong");
          }
          addContinue(modeOrder);
        });
        grid.appendChild(b);
      });
      setMascot("Find the letter that slots perfectly into the sequence!", "idle");
    }
    function addContinue(fn) {
      const div = document.createElement("div");
      div.style.marginTop = "16px";
      div.innerHTML = `<button class="primary-btn" id="again">Next round</button>`;
      gameView.appendChild(div);
      document.getElementById("again").addEventListener("click", fn);
    }
    let emojiProgress = /* @__PURE__ */ new Set();
    function modeEmoji() {
      const remaining = ALPHABET.filter((L) => !emojiProgress.has(L));
      const pool = remaining.length ? remaining : ALPHABET;
      const target = pool[Math.floor(Math.random() * pool.length)];
      gameView.innerHTML = panelHeader("\u{1F34E} Emoji Hint Mode") + `
      <p>Which letter does this picture start with? (${emojiProgress.size}/26 learned)</p>
      <div class="big-emoji">${EMOJI_MAP[target]}</div>
      <div class="letter-grid" id="letterGrid"></div>
    `;
      wireBack();
      const grid = document.getElementById("letterGrid");
      ALPHABET.forEach((L) => {
        const b = document.createElement("button");
        b.className = "letter-btn";
        b.textContent = L;
        b.addEventListener("click", () => {
          [...grid.children].forEach((x) => x.disabled = true);
          if (L === target) {
            b.classList.add("correct");
            addScore(8, true);
            emojiProgress.add(target);
            unlock("first_win");
            if (emojiProgress.size >= 26) unlock("alphabet_master");
            setMascot(`Yes! ${EMOJI_MAP[target]} starts with ${target}!`, "happy", true);
            audio.beep("win");
          } else {
            b.classList.add("wrong");
            addScore(0, false);
            setMascot(`It was ${target}, for ${EMOJI_MAP[target]}.`, "sad", true);
            audio.beep("wrong");
          }
          addContinue(modeEmoji);
        });
        grid.appendChild(b);
      });
      setMascot("Squibb the cat loves this one \u2014 match the picture to its letter!", "idle", true);
    }
    function modeReverse() {
      const idx = 1 + Math.floor(Math.random() * 24);
      const target = ALPHABET[idx];
      const before = ALPHABET[idx - 1], after = ALPHABET[idx + 1];
      gameView.innerHTML = panelHeader("\u2194\uFE0F Reverse Guess") + `
      <div class="hint-item" style="font-size:1rem; text-align:center;">
        "This letter comes after <b>${before}</b> and before <b>${after}</b>."
      </div>
      <div class="letter-grid" id="letterGrid" style="margin-top:16px;"></div>
    `;
      wireBack();
      const grid = document.getElementById("letterGrid");
      const options = /* @__PURE__ */ new Set([target]);
      while (options.size < 6) {
        options.add(ALPHABET[Math.floor(Math.random() * 26)]);
      }
      [...options].sort(() => Math.random() - 0.5).forEach((L) => {
        const b = document.createElement("button");
        b.className = "letter-btn";
        b.textContent = L;
        b.addEventListener("click", () => {
          [...grid.children].forEach((x) => x.disabled = true);
          if (L === target) {
            b.classList.add("correct");
            addScore(10, true);
            unlock("first_win");
            setMascot(`Exactly right \u2014 ${target}! \u{1F389}`, "happy");
            audio.beep("win");
          } else {
            b.classList.add("wrong");
            addScore(0, false);
            setMascot(`Close! The answer was ${target}.`, "sad");
            audio.beep("wrong");
          }
          addContinue(modeReverse);
        });
        grid.appendChild(b);
      });
      setMascot("Work out which letter fits between the two clues!", "idle");
    }
    function modeScramble() {
      const start = Math.floor(Math.random() * 24);
      const correctOrder = [ALPHABET[start], ALPHABET[start + 1], ALPHABET[start + 2]];
      let shuffled = [...correctOrder].sort(() => Math.random() - 0.5);
      if (shuffled.join("") === correctOrder.join("")) shuffled.reverse();
      let picked = [];
      function render() {
        gameView.innerHTML = panelHeader("\u{1F500} Scramble Mode") + `
        <p>Tap the letters in alphabetical order.</p>
        <div class="sequence-row">${picked.map((L) => `<div class="seq-tile">${L}</div>`).join("")}${Array.from({ length: 3 - picked.length }).map(() => `<div class="seq-tile blank">?</div>`).join("")}</div>
        <div class="sequence-row" id="tileRow">
          ${shuffled.map((L, i) => `<button class="seq-tile" data-i="${i}" style="cursor:pointer;" ${picked.includes(L) ? "disabled" : ""}>${L}</button>`).join("")}
        </div>
      `;
        wireBack();
        document.querySelectorAll("#tileRow button:not(:disabled)").forEach((btn) => {
          btn.addEventListener("click", () => {
            const L = btn.textContent;
            picked.push(L);
            btn.disabled = true;
            if (picked.length === 3) {
              if (picked.join("") === correctOrder.join("")) {
                addScore(12, true);
                unlock("first_win");
                setMascot(`Perfect order: ${correctOrder.join(" ")} \u{1F389}`, "happy");
                audio.beep("win");
              } else {
                addScore(0, false);
                setMascot(`Not quite \u2014 correct order was ${correctOrder.join(" ")}.`, "sad");
                audio.beep("wrong");
              }
              setTimeout(() => addContinue(modeScramble), 50);
            }
            render_partial();
          });
        });
      }
      function render_partial() {
        document.querySelector(".sequence-row").innerHTML = picked.map((L) => `<div class="seq-tile">${L}</div>`).join("") + Array.from({ length: 3 - picked.length }).map(() => `<div class="seq-tile blank">?</div>`).join("");
      }
      render();
      setMascot("Three letters, all mixed up \u2014 put them back in order!", "idle");
    }
    function modeMemory() {
      const diff = DIFF[state.difficulty];
      const startIdx = Math.floor(Math.random() * (26 - diff.memoryLen));
      const sequence = ALPHABET.slice(startIdx, startIdx + diff.memoryLen);
      let typed = [];
      gameView.innerHTML = panelHeader("\u{1F9E0} Memory Mode") + `
      <p>Memorize this sequence \u2014 it will disappear in a few seconds!</p>
      <div class="sequence-row" id="seqRow">${sequence.map((L) => `<div class="seq-tile">${L}</div>`).join("")}</div>
    `;
      wireBack();
      setMascot("Look closely and remember the order!", "idle");
      const t = setTimeout(() => {
        document.getElementById("seqRow").innerHTML = sequence.map(() => `<div class="seq-tile hidden-mem">?</div>`).join("");
        renderInput();
        setMascot("Now type the sequence back, in order!", "idle");
      }, diff.memoryShow);
      activeTimers.push(t);
      function renderInput() {
        const grid = document.createElement("div");
        grid.className = "letter-grid";
        grid.id = "letterGrid";
        gameView.appendChild(grid);
        const progress = document.createElement("div");
        progress.className = "sequence-row";
        progress.id = "progRow";
        progress.style.marginTop = "14px";
        gameView.insertBefore(progress, grid);
        updateProgress();
        ALPHABET.forEach((L) => {
          const b = document.createElement("button");
          b.className = "letter-btn";
          b.textContent = L;
          b.addEventListener("click", () => {
            typed.push(L);
            const isRight = sequence[typed.length - 1] === L;
            b.classList.add(isRight ? "correct" : "wrong");
            updateProgress();
            if (typed.length === sequence.length) {
              const allRight = typed.join("") === sequence.join("");
              [...grid.children].forEach((x) => x.disabled = true);
              if (allRight) {
                addScore(sequence.length * 8, true);
                unlock("first_win");
                if (state.difficulty === "hard") unlock("memory_king");
                setMascot(`Flawless memory! ${sequence.join("")} \u{1F389}`, "happy");
                audio.beep("win");
              } else {
                addScore(0, false);
                setMascot(`So close \u2014 it was ${sequence.join("")}.`, "sad");
                audio.beep("wrong");
              }
              addContinue(modeMemory);
            }
          });
          grid.appendChild(b);
        });
      }
      function updateProgress() {
        const p = document.getElementById("progRow");
        if (!p) return;
        p.innerHTML = sequence.map((_, i) => i < typed.length ? `<div class="seq-tile">${typed[i]}</div>` : `<div class="seq-tile blank">?</div>`).join("");
      }
    }
    function modeSound() {
      const target = ALPHABET[Math.floor(Math.random() * 26)];
      gameView.innerHTML = panelHeader("\u{1F50A} Sound Mode") + `
      <p>Listen carefully, then pick the letter you heard.</p>
      <div style="text-align:center;margin:16px 0;">
        <button class="primary-btn secondary" id="playBtn">\u{1F50A} Play letter</button>
      </div>
      <div class="letter-grid" id="letterGrid"></div>
    `;
      wireBack();
      document.getElementById("playBtn").addEventListener("click", () => audio.speak(target));
      audio.speak(target);
      const grid = document.getElementById("letterGrid");
      ALPHABET.forEach((L) => {
        const b = document.createElement("button");
        b.className = "letter-btn";
        b.textContent = L;
        b.addEventListener("click", () => {
          [...grid.children].forEach((x) => x.disabled = true);
          if (L === target) {
            b.classList.add("correct");
            addScore(8, true);
            unlock("first_win");
            setMascot(`Yes, that was ${target}! Great ears! \u{1F389}`, "happy");
            audio.beep("win");
          } else {
            b.classList.add("wrong");
            addScore(0, false);
            setMascot(`It was ${target}. Listen again next time!`, "sad");
            audio.beep("wrong");
          }
          addContinue(modeSound);
        });
        grid.appendChild(b);
      });
      setMascot("Hit play, then tap the letter you think you heard!", "idle");
      if (!("speechSynthesis" in window)) {
        setMascot("Your browser doesn't support text-to-speech, but you can still guess!", "idle");
      }
    }
    document.getElementById("themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "light" ? "dark" : "light";
      document.body.setAttribute("data-theme", state.theme);
      document.getElementById("themeToggle").textContent = state.theme === "light" ? "\u{1F319} Dark" : "\u2600\uFE0F Light";
    });
    document.getElementById("soundToggle").addEventListener("click", (e) => {
      state.sound = !state.sound;
      e.target.textContent = state.sound ? "\u{1F50A} Sound" : "\u{1F507} Muted";
    });
    document.getElementById("difficultySelect").addEventListener("change", (e) => {
      state.difficulty = e.target.value;
    });
    renderMenu();
    updateScoreboard();
  })();
})();
