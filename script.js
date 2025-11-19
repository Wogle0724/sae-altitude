/* ---------- Quiz logic & reveal flow ---------- */
const quiz = document.getElementById('quiz');
const options = Array.from(document.querySelectorAll('.option'));
const badge = document.getElementById('answer-badge');

const info = document.getElementById('info');

let bgmPrimed = false;

/**
 * Prime the background music from within a user gesture.
 * On iOS/mobile, audio.play() must be called directly in a click/tap handler.
 * We start it muted here and fade it in later.
 */
function primeBgmFromGesture(){
  const el = document.getElementById('bgm');
  if (!el || bgmPrimed) return;
  try{
    // Play once while muted to satisfy iOS "user gesture" requirement,
    // then immediately pause and reset so no sound is heard yet.
    el.loop = true;
    el.muted = true;
    el.currentTime = 0;
    const playPromise = el.play();
    bgmPrimed = true;

    if (playPromise && typeof playPromise.then === 'function'){
      playPromise.then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;   // ready for real playback later
      }).catch(() => {
        // ignore; we'll just rely on later playBgm attempt
        el.muted = false;
      });
    }else{
      // Fallback for older browsers: pause immediately
      el.pause();
      el.currentTime = 0;
      el.muted = false;
    }
  }catch(e){
    // If the browser still blocks this, fail silently.
  }
}

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
    const dateBig = document.getElementById('altitude-date');
    const guestBig = document.getElementById('altitude-guest');
    const altitudeContainer = document.getElementById('altitude-container');
    const bg = document.getElementById('bg');
    const snow = document.getElementById('snow-wrap');
    const blackout = document.getElementById('blackout');
    const skierSvg = document.getElementById('skier');
    const introLine = document.getElementById('intro-line');
    const presents = document.getElementById('presents');
    const altitudeFlash = document.getElementById('altitude-flash');
    const bgm = document.getElementById('bgm');
    const BIG_DATE_TEXT  = 'SAT · DEC 5';
    const BIG_GUEST_TEXT = 'FT. EMERSON, AMXLIA';

    btn.classList.add('correct');
    // Prime the audio while we're still in the user gesture for mobile browsers
    primeBgmFromGesture();

    // 1) Fade to black
    blackout.classList.add('visible');

    // After a brief pause, hide quiz and show the invitation line with a typewriter effect.
    // Once it finishes (including a suspenseful pause and fade out),
    // show the centered speaker, start the music and the existing neon / SAE Presents sequence.
    setTimeout(() => {
      quiz.classList.add('hidden');
      runInvitationLine(introLine, {
        onDone: () => {
          showCenteredSpeaker();
          // Wait for the speaker animation (~1.8s) to finish before starting SAE Presents + ALTITUDE flow
          setTimeout(() => {
            playBgm({ volume: 0.4, fadeMs: 2000, loop: true });
            scheduleNeonSequence();
          }, 2000);
        }
      });
    }, 600);
  });
});

/**
 * Shrink the element's font-size just enough to fit on one line.
 * Starts from the computed size (matching the title) and only shrinks if needed.
 */
function shrinkToFitOneLine(el, { minPx = 24, paddingFactor = 0.98 } = {}){
  if (!el) return;
  const parent = el.parentElement;
  if (!parent) return;
  el.style.whiteSpace = 'nowrap';
  el.style.display = 'block';

  // Start from whatever CSS computed (same as title)
  const computed = parseFloat(getComputedStyle(el).fontSize) || 96;
  let lo = minPx, hi = computed;

  // If it already fits at computed size, keep it
  el.style.fontSize = hi + 'px';
  if (el.scrollWidth <= parent.clientWidth * paddingFactor) return;

  // Binary search downwards until it fits
  for (let i = 0; i < 12; i++){
    const mid = (lo + hi) / 2;
    el.style.fontSize = mid + 'px';
    const fits = el.scrollWidth <= parent.clientWidth * paddingFactor;
    if (fits){
      lo = mid;
    }else{
      hi = mid;
    }
  }
  el.style.fontSize = Math.max(minPx, Math.floor(lo)) + 'px';
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

/**
 * Show a centered invitation line in a simple typewriter style over black.
 * Types the text out, holds it for suspense, then fades it away.
 */
function runInvitationLine(el, { onDone } = {}){
  if (!el){
    if (typeof onDone === 'function') onDone();
    return;
  }
  // Use the text already in the DOM if present; otherwise fall back to a default.
  const fullText = (el.textContent || '').trim() ||
    'We invite you to celebrate the last day of class';

  el.textContent = '';
  el.classList.remove('neon-base', 'neon-in', 'neon-out', 'visible');
  el.style.opacity = 1;
  el.style.transition = 'opacity 800ms ease';
  el.setAttribute('aria-hidden', 'false');

  (async () => {
    // Type each character
    for (let i = 0; i < fullText.length; i++){
      el.textContent += fullText[i];
      await sleep(55);  // typing speed
    }

    // Hold on the full line for suspense
    await sleep(2200);

    // Fade it away
    el.style.opacity = 0;
    await sleep(800);
    el.setAttribute('aria-hidden', 'true');

    if (typeof onDone === 'function') onDone();
  })();
}

/**
 * After the invitation line sequence completes, this schedules the original
 * neon flow: "SAE Presents" over black, full-screen ALTITUDE flash,
 * then snow/bg/skier reveal and big ALTITUDE/date/guest sequence.
 */
function scheduleNeonSequence(){
  const presents        = document.getElementById('presents');
  const altitudeFlash   = document.getElementById('altitude-flash');
  const snow            = document.getElementById('snow-wrap');
  const blackout        = document.getElementById('blackout');
  const bg              = document.getElementById('bg');
  const skierSvg        = document.getElementById('skier');
  const altitudeContainer = document.getElementById('altitude-container');
  const title           = document.getElementById('altitude-title');
  const dateBig         = document.getElementById('altitude-date');
  const guestBig        = document.getElementById('altitude-guest');
  const BIG_DATE_TEXT   = 'SAT · DEC 5';
  const BIG_GUEST_TEXT  = 'FT. EMERSON, AMXLIA';

  // T0+0.4s: "SAE Presents" over black
  setTimeout(() => {
    neonBlink(presents, { inMs: 1100, holdMs: 500, outMs: 900, out: true });
  }, 400);

  // T0+3.4s: big "ALTITUDE" wordmark over black
  setTimeout(() => {
    altitudeFlash.textContent = 'ALTITUDE';
    neonBlink(altitudeFlash, { inMs: 1100, holdMs: 500, outMs: 900, out: true });
  }, 3400);

  // T0+6.8s: glitch in snow wrapper (then start the run) and lift blackout
  setTimeout(() => {
    neonBlink(snow, { inMs: 900, holdMs: 0, out: false });
    snow.classList.add('run');
    blackout.classList.remove('visible');
  }, 6800);

  // T0+9.2s: reveal bg & skier
  setTimeout(() => {
    neonBlink(bg, { inMs: 900, holdMs: 0, out: false });
    neonBlink(skierSvg, { inMs: 900, holdMs: 0, out: false });
  }, 9200);

  // T0+11.2s: show centered ALTITUDE title big, then flash each line in/out with gaps
  setTimeout(() => {
    altitudeContainer.classList.add('visible');
    altitudeContainer.setAttribute('aria-hidden', 'false');

    (async () => {
      // Title flashes in, then out
      title.classList.add('show');
      await neonBlink(title, { inMs: 900, holdMs: 400, outMs: 700, out: true });
      await sleep(2000);

      // Date flashes in, then out
      dateBig.textContent = BIG_DATE_TEXT;
      dateBig.classList.add('show');
      dateBig.setAttribute('aria-hidden', 'false');
      shrinkToFitOneLine(dateBig, { minPx: 24, paddingFactor: 0.98 });
      await neonBlink(dateBig, { inMs: 900, holdMs: 400, outMs: 700, out: true });
      await sleep(2000);

      // Guest flashes in, then out
      guestBig.textContent = BIG_GUEST_TEXT;
      guestBig.classList.add('show');
      guestBig.setAttribute('aria-hidden', 'false');
      shrinkToFitOneLine(guestBig, { minPx: 24, paddingFactor: 0.98 });
      await neonBlink(guestBig, { inMs: 900, holdMs: 400, outMs: 700, out: true });
      await sleep(2000);

      // Fade to black
      blackout.classList.add('visible');
      await sleep(800);

      // Start continuous random flashing ALTITUDE on loop over black
      altitudeFlash.textContent = 'ALTITUDE';
      startRandomAltitudeFlash(altitudeFlash, ['ALTITUDE', BIG_DATE_TEXT]);
    })();
  }, 11200);
}

/**
 * Start a continuous random flash loop for an element using neonBlink.
 * Returns a stopper function if needed in the future.
 */
function startRandomAltitudeFlash(el, texts = ['ALTITUDE']){
  let running = true;
  let idx = 0;                       // which text to show next
  (async () => {
    // Ensure glow base is applied
    el.classList.add('neon-base');
    while (running){
      // Pick which text to display for this cycle
      const nextText = (Array.isArray(texts) && texts.length)
        ? texts[idx % texts.length]
        : 'ALTITUDE';
      el.textContent = nextText;
      idx++;

      const inMs = 700 + Math.floor(Math.random()*500);   // 700–1200ms
      const holdMs = 150 + Math.floor(Math.random()*400); // 150–550ms
      const outMs = 500 + Math.floor(Math.random()*500);  // 500–1000ms
      await neonBlink(el, { inMs, holdMs, outMs, out: true });
      await sleep(300 + Math.floor(Math.random()*500));   // 300–800ms pause
    }
  })();
  return () => { running = false; };
}

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

    // Start (or restart) playback at the precise moment we want audio,
    // even on mobile. Because we've already "primed" via a prior gesture,
    // this call should now be allowed.
    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === 'function'){
      await playPromise;
    }

    // Now fade to the target volume, giving the same timing as desktop.
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

window.addEventListener('resize', () => {
  const dateEl = document.getElementById('altitude-date');
  const guestEl = document.getElementById('altitude-guest');
  if (dateEl && dateEl.offsetParent && dateEl.style.opacity !== '0'){
    shrinkToFitOneLine(dateEl, { minPx: 24, paddingFactor: 0.98 });
  }
  if (guestEl && guestEl.offsetParent && guestEl.style.opacity !== '0'){
    shrinkToFitOneLine(guestEl, { minPx: 24, paddingFactor: 0.98 });
  }
});

/**
 * Create and animate a small speaker "sound on" SVG in the bottom-right.
 * The icon cycles through 0 bars → 1 bar → 2 bars (twice), then fades out.
 */
function showSoundOnIcon(){
  const el = createSoundIconSVG();
  document.body.appendChild(el);

  // animate: 0 bars → 1 bar → 2 bars, repeat twice
  (async () => {
    const bar1 = el.querySelector('[data-bar="1"]');
    const bar2 = el.querySelector('[data-bar="2"]');

    // fade in icon
    requestAnimationFrame(() => { el.style.opacity = 1; });

    // ensure starting state (no bars)
    bar1.style.opacity = 0;
    bar2.style.opacity = 0;

    for (let cycle = 0; cycle < 2; cycle++){
      // no bars
      bar1.style.opacity = 0; 
      bar2.style.opacity = 0; 
      await sleep(220);

      // one bar
      bar1.style.opacity = 1; 
      bar2.style.opacity = 0; 
      await sleep(220);

      // two bars
      bar1.style.opacity = 1; 
      bar2.style.opacity = 1; 
      await sleep(260);
    }

    // fade out and remove
    el.style.opacity = 0;
    await sleep(250);
    el.remove();
  })();
}

/**
 * Builds a compact speaker SVG with two sound bars.
 * Positioned with inline styles to avoid stylesheet edits.
 */
function createSoundIconSVG(){
  const svgns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '28');
  svg.setAttribute('height', '28');
  svg.setAttribute('aria-hidden', 'true');

  // Inline positioning (avoid touching CSS files)
  svg.style.position = 'fixed';
  svg.style.right = '16px';
  svg.style.bottom = '16px';
  svg.style.opacity = '0';
  svg.style.transition = 'opacity .25s ease';
  svg.style.zIndex = '13';
  svg.style.color = '#e6f7ff';     // currentColor for strokes/fills
  svg.style.filter = 'drop-shadow(0 0 6px rgba(230,247,255,.35))';

  // Speaker body (uses currentColor)
  const body = document.createElementNS(svgns, 'polygon');
  body.setAttribute('points', '3,10 7,10 11,7 11,17 7,14 3,14');
  body.setAttribute('fill', 'currentColor');
  body.setAttribute('stroke', 'currentColor');
  body.setAttribute('stroke-width', '0.75');

  // Bars share stroke styling
  const mkBar = (d, which) => {
    const p = document.createElementNS(svgns, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '2');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('opacity', '0');           // start hidden
    p.setAttribute('data-bar', String(which)); // "1" or "2"
    return p;
  };

  // Small and large arcs emanating from ~x=14..17, centered on y=12
  const bar1 = mkBar('M14 9 A3 3 0 0 1 14 15', 1);   // inner arc
  const bar2 = mkBar('M17 7 A6 6 0 0 1 17 17', 2);   // outer arc

  svg.appendChild(body);
  svg.appendChild(bar1);
  svg.appendChild(bar2);

  return svg;
}

/**
 * Show the large, centered speaker overlay and run the 0→1→2 bars sequence twice.
 * The CSS keyframes encapsulate the bar timing; we simply toggle classes and hide after.
 */
function showCenteredSpeaker(){
  const overlay = document.getElementById('sound-overlay');
  const svg = document.getElementById('speaker-inline');
  if (!overlay || !svg) return;
  // show overlay
  overlay.classList.add('show');
  // trigger bar animation
  svg.classList.remove('play'); // reset if needed
  // next frame to ensure keyframes restart
  requestAnimationFrame(() => {
    svg.classList.add('play');
  });
  // hide after animation completes (duration 1.8s) + a small cushion
  setTimeout(() => {
    overlay.classList.remove('show');
    svg.classList.remove('play');
  }, 2000);
}
