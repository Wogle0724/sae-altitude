/* ---------- Quiz logic & reveal flow ---------- */
const quiz = document.getElementById('quiz');
const options = Array.from(document.querySelectorAll('.option'));
const badge = document.getElementById('answer-badge');
const info = document.getElementById('info');

options.forEach(btn => {
  btn.addEventListener('click', () => {
    const isCorrect = btn.dataset.correct === 'true';

    if (!isCorrect) {
      // mark wrong and shake
      btn.classList.remove('correct');
      btn.classList.add('wrong');
      btn.classList.add('shake');
      // remove shake class after anim ends to allow re-trigger
      btn.addEventListener('animationend', () => btn.classList.remove('shake'), { once:true });
      return;
    }

    // Disable all options and fade out non-selected content
    options.forEach(o => {
      o.disabled = true;
      if (o !== btn) {
        o.style.transition = 'opacity .3s ease';
        o.style.opacity = '0';
      }
    });
    const title = document.getElementById('altitude-title');
    const altitudeContainer = document.getElementById('altitude-container');
    const bg = document.getElementById('bg');
    const snow = document.getElementById('snow-wrap');
    const blackout = document.getElementById('blackout');
    const skierSvg = document.getElementById('skier');
    const presents = document.getElementById('presents');
    const bgm = document.getElementById('bgm');

    btn.classList.add('correct');

    // 1) Fade to black
    blackout.classList.add('visible');


    // After blackout, hide the quiz so it won't show when we fade back in
    setTimeout(() => {
      quiz.classList.add('hidden');
      playBgm({ volume: 0.4, fadeMs: 2000, loop: true });
    }, 800);

    // === New flow ===
    // T+2.6s: neon blink/glitch "SAE Presents" in and out over black
    setTimeout(() => {
      neonBlink(presents, { inMs: 1100, holdMs: 500, outMs: 900, out: true });
    }, 2600);

    setTimeout(() => {
      // Glitch in snow wrapper (then start the run)
      neonBlink(snow, { inMs: 900, holdMs: 0, out: false });
      snow.classList.add('run');
      blackout.classList.remove('visible');
    }, 8600);

    // T+5s: start snowfall (still black), then reveal bg & skier and lift blackout
    setTimeout(() => {
      // Glitch in background and skier (no fades)
      neonBlink(bg, { inMs: 900, holdMs: 0, out: false });
      setTimeout(() => { neonBlink(skierSvg, { inMs: 900, holdMs: 0, out: false }); }, 200);
    }, 11000);

    // T+8s: show centered ALTITUDE container/title
    setTimeout(() => {
      altitudeContainer.classList.add('visible');
      altitudeContainer.setAttribute('aria-hidden', 'false');

      // Keep size consistent during blink: set final scale first, keep opacity 0, then glitch in
      title.style.opacity = 0;           // prevent a 1-frame flash
      title.classList.add('show');       // apply final centered scale (1.2x) before blinking
      neonBlink(title, { inMs: 1100, holdMs: 0, out: false }); // blink controls opacity

      // T+11s: dock container to top-left, then type after transition ends
      setTimeout(() => {
        altitudeContainer.classList.add('dock');

        const onDocked = (evt) => {
          if (evt.target !== altitudeContainer) return;
          altitudeContainer.removeEventListener('transitionend', onDocked);

          // Glitch in the info block (then type lines)
          neonBlink(info, { inMs: 700, holdMs: 0, out: false });
          info.setAttribute('aria-hidden', 'false');
          typeSequence([
            { text: 'SATURDAY · DEC 5 · 10:00 PM' },
            { text: 'House 6 · SAE' },
            { text: 'Feat. Aidan Emerson, AMXLIA' },
          ], 24);
        };
        altitudeContainer.addEventListener('transitionend', onDocked);
      }, 4000);
    }, 13000);
  });
});

/**
 * Type a list of lines, one after the other.
 * @param {Array<{text:string, cls?:string}>} lines
 * @param {number} cps characters per second (approx)
 */
function typeSequence(lines, cps=30){
  const delay = 1000 / cps;

  (async () => {
    for (const line of lines){
      const p = document.createElement('p');
      p.className = `line${line.cls ? ' ' + line.cls : ''}`;
      info.appendChild(p);
      await typeText(line.text, p, delay);
      await sleep(250);
    }
  })();
}

/**
 * Progressive typewriter into an element.
 * Uses requestAnimationFrame with time budget for steadier typing.
 */
async function typeText(text, el, stepDelay){
  return new Promise(resolve => {
    let i = 0;
    const tick = () => {
      if (i >= text.length) return resolve();
      // type a few chars per frame based on delay
      let typed = 0;
      while (typed < 2 && i < text.length){
        el.textContent += text[i++];
        typed++;
      }
      setTimeout(() => requestAnimationFrame(tick), stepDelay);
    };
    tick();
  });
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

/**
 * Neon blink/glitch: flicker in, optional hold, then flicker out.
 * If opts.out === false, it will only flicker in.
 * @param {HTMLElement} el
 * @param {{inMs?:number, holdMs?:number, outMs?:number, out?:boolean, onDone?:()=>void}} opts
 */
async function neonBlink(el, opts = {}){
  const { inMs = 1100, holdMs = 600, outMs = 900, out = true, onDone } = opts;
  if (!el) return;
  // Ensure base style for glow
  el.classList.add('neon-base');
  // Make sure it's visible (not aria-hidden) for screen readers during the blink
  el.setAttribute('aria-hidden', 'false');

  // Reset any prior state
  el.classList.remove('neon-in','neon-out','visible');

  // Flicker in
  el.classList.add('neon-in');
  await sleep(inMs);

  // Optional steady hold (fully on)
  if (holdMs > 0) await sleep(holdMs);

  if (out){
    // Flicker out
    el.classList.remove('neon-in');
    el.classList.add('neon-out');
    await sleep(outMs);
    // After out, hide the element again
    el.classList.remove('neon-out');
    el.style.opacity = 0;
    el.setAttribute('aria-hidden', 'true');
  }else{
    // Leave it fully on at the end of the "in" sequence
    el.classList.remove('neon-in');
    el.style.opacity = 1;
  }

  if (typeof onDone === 'function') onDone();
}

/* ---------- Audio helpers (bgm) ---------- */
function audioFadeIn(audio, target = 0.6, ms = 1200){
  const steps = 100;
  const step = target / steps;
  const dt = ms / steps;
  audio.volume = Math.max(0, Math.min(target, audio.volume || 0));
  return new Promise(resolve => {
    const id = setInterval(() => {
      audio.volume = Math.min(target, audio.volume + step);
      if (audio.volume >= target - 0.001){
        audio.volume = target;
        clearInterval(id);
        resolve();
      }
    }, dt);
  });
}

function audioFadeOut(audio, ms = 800){
  const start = audio.volume || 0;
  const steps = 24;
  const step = start / steps;
  const dt = ms / steps;
  return new Promise(resolve => {
    const id = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - step);
      if (audio.volume <= 0.001){
        audio.volume = 0;
        clearInterval(id);
        resolve();
      }
    }, dt);
  });
}

/**
 * Play the background music safely after a user gesture.
 * @param {{startAt?:number, volume?:number, fadeMs?:number, loop?:boolean}} opts
 */
async function playBgm(opts = {}){
  const { startAt = 0, volume = 0.6, fadeMs = 1200, loop = true } = opts;
  const el = document.getElementById('bgm');
  if (!el) return;
  try{
    el.loop = loop;
    el.currentTime = startAt;
    el.volume = 0;
    await el.play();             // requires user gesture (your click provides it)
    await audioFadeIn(el, volume, fadeMs);
  }catch(e){
    // Some browsers may still block play() depending on settings; fail silently.
  }
}

/**
 * Stop and optionally fade out the background music.
 * @param {number} fadeMs - Set to 0 for instant stop.
 */
async function stopBgm(fadeMs = 600){
  const el = document.getElementById('bgm');
  if (!el) return;
  try{
    if (fadeMs > 0){
      await audioFadeOut(el, fadeMs);
    }
    el.pause();
    el.currentTime = 0;
  }catch(e){
    // no-op
  }
}


/* ---------- Optional: pause/resume skier on tab visibility ---------- */
document.addEventListener('visibilitychange', () => {
  const skier = document.getElementById('skier');
  if (!skier) return;
  skier.style.animationPlayState = document.hidden ? 'paused' : 'running';
});
