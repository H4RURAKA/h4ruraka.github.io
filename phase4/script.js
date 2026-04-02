(function () {
  const card = document.querySelector('.card-links');
  if (!card) return;

  const rows = Array.from(card.querySelectorAll('li'));
  const root = document.documentElement;
  const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  if (coarsePointer) return;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  let speedTarget = 0;
  let speed = 0;
  let jitterTarget = 0;
  let jitter = 0;

  let active = false;
  let hasPointer = false;
  let lastX = window.innerWidth * 0.5;
  let lastY = window.innerHeight * 0.5;
  let rafId = 0;

  const phaseSeed = Math.random() * Math.PI * 2;

  function setBaseVars() {
    card.style.setProperty('--mouse-rot-z', '0deg');
    card.style.setProperty('--mouse-rot-x', '0deg');
    card.style.setProperty('--mouse-rot-y', '0deg');
    card.style.setProperty('--mouse-shift-x', '0px');
    card.style.setProperty('--mouse-shift-y', '0px');
    card.style.setProperty('--anti-x', '0px');
    card.style.setProperty('--anti-y', '0px');
    card.style.setProperty('--anti-r', '0deg');

    root.style.setProperty('--split-x-pos', '0px');
    root.style.setProperty('--split-y-pos', '0px');
    root.style.setProperty('--split-x-neg', '0px');
    root.style.setProperty('--split-y-neg', '0px');

    rows.forEach((row) => {
      row.style.setProperty('--micro-y', '0px');
      row.style.setProperty('--micro-r', '0deg');
    });
  }

  function updateCard(now) {
    speed += (speedTarget - speed) * 0.16;
    jitter += (jitterTarget - jitter) * 0.14;

    speedTarget *= active ? 0.88 : 0.8;
    jitterTarget *= 0.82;

    const activity = clamp(speed + jitter * 0.56, 0, 1.25);

    const waveA = Math.sin(now * 0.0063 + phaseSeed);
    const waveB = Math.cos(now * 0.0051 + phaseSeed * 1.7);
    const waveC = Math.sin(now * 0.0044 + phaseSeed * 2.3);

    const rotZ = waveA * (1.3 * activity);
    const rotX = waveB * (2.2 * activity);
    const rotY = waveC * (2.8 * activity);
    const shiftX = waveB * (4.6 * activity);
    const shiftY = waveA * (3.8 * activity);

    const antiX = -shiftX * 0.2;
    const antiY = -shiftY * 0.17;
    const antiR = -rotZ * 0.18;

    card.style.setProperty('--mouse-rot-z', rotZ.toFixed(2) + 'deg');
    card.style.setProperty('--mouse-rot-x', rotX.toFixed(2) + 'deg');
    card.style.setProperty('--mouse-rot-y', rotY.toFixed(2) + 'deg');
    card.style.setProperty('--mouse-shift-x', shiftX.toFixed(2) + 'px');
    card.style.setProperty('--mouse-shift-y', shiftY.toFixed(2) + 'px');
    card.style.setProperty('--anti-x', antiX.toFixed(2) + 'px');
    card.style.setProperty('--anti-y', antiY.toFixed(2) + 'px');
    card.style.setProperty('--anti-r', antiR.toFixed(2) + 'deg');

    const splitAmp = activity * 1.45;
    const splitX = Math.sin(now * 0.011 + phaseSeed * 0.9) * splitAmp;
    const splitY = Math.cos(now * 0.009 + phaseSeed * 1.3) * splitAmp * 0.62;

    root.style.setProperty('--split-x-pos', splitX.toFixed(2) + 'px');
    root.style.setProperty('--split-y-pos', splitY.toFixed(2) + 'px');
    root.style.setProperty('--split-x-neg', (-splitX).toFixed(2) + 'px');
    root.style.setProperty('--split-y-neg', (-splitY).toFixed(2) + 'px');

    const rowActivity = clamp(activity, 0, 1);
    rows.forEach((row, index) => {
      const phase = now * 0.0075 + index * 1.63 + phaseSeed;
      const microY = Math.cos(phase) * (0.24 + rowActivity * 0.36);
      const microR = Math.sin(phase * 0.86) * (0.14 + rowActivity * 0.28);
      row.style.setProperty('--micro-y', microY.toFixed(2) + 'px');
      row.style.setProperty('--micro-r', microR.toFixed(2) + 'deg');
    });

    const settled = speed < 0.01 && jitter < 0.01 && speedTarget < 0.01 && jitterTarget < 0.01;
    if (active || !settled) {
      rafId = window.requestAnimationFrame(updateCard);
      return;
    }

    setBaseVars();
    rafId = 0;
  }

  function kick() {
    if (!rafId) {
      rafId = window.requestAnimationFrame(updateCard);
    }
  }

  function onPointerMove(event) {
    if (!hasPointer) {
      lastX = event.clientX;
      lastY = event.clientY;
      hasPointer = true;
      return;
    }

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    const distance = Math.hypot(dx, dy);
    const impulse = clamp(distance / 72, 0, 1.4);

    speedTarget = clamp(speedTarget + impulse * 0.68, 0, 1.35);
    jitterTarget = clamp(jitterTarget + impulse * 0.56, 0, 1.2);

    active = true;
    kick();
  }

  function release() {
    active = false;
    hasPointer = false;
    kick();
  }

  function stop() {
    active = false;
    hasPointer = false;
    speed = 0;
    speedTarget = 0;
    jitter = 0;
    jitterTarget = 0;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    setBaseVars();
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', release, { passive: true });
  window.addEventListener('blur', release, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
      return;
    }
    kick();
  });
})();
