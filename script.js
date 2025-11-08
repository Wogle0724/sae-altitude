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
    // T+2s: show "SAE Presents" over black
    setTimeout(() => {
      presents.classList.add('visible');
      presents.setAttribute('aria-hidden', 'false');
    }, 2600);

    // T+3s: hide "SAE Presents"
    setTimeout(() => {
      presents.classList.remove('visible');
    }, 4600);

    setTimeout(() => {
      snow.classList.add('visible');
      snow.classList.add('run');
      blackout.classList.remove('visible');
    }, 8600);

    // T+5s: start snowfall (still black), then reveal bg & skier and lift blackout
    setTimeout(() => {
      // reveal the mountain and skier, and remove blackout to show them
      bg.classList.add('visible');
      setTimeout(() => { skierSvg.classList.add('visible'); }, 200);
    }, 11000);

    // T+8s: show centered ALTITUDE container/title
    setTimeout(() => {
      altitudeContainer.classList.add('visible');
      altitudeContainer.setAttribute('aria-hidden', 'false');

      title.setAttribute('aria-hidden', 'false');
      title.classList.add('show');

      // T+11s: dock container to top-left, then type after transition ends
      setTimeout(() => {
        altitudeContainer.classList.add('dock');

        const onDocked = (evt) => {
          if (evt.target !== altitudeContainer) return;
          altitudeContainer.removeEventListener('transitionend', onDocked);

          info.classList.add('visible');
          info.setAttribute('aria-hidden', 'false');
          typeSequence([
            { text: 'SAE ALTITUDE 2025' },
            { text: 'SATURDAY · DEC 5 · 10:00 PM' },
            { text: 'House 6 · SAE' },
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
