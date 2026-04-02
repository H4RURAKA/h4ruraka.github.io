const orbit = document.getElementById("orbit");
const tags = [...document.querySelectorAll(".tag")];
const run = document.getElementById("run");
const mood = document.getElementById("mood");
const motion = {
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.5,
  speed: 0,
  angle: 0,
  activity: 0,
};

const fx =
  typeof window.createLiquidFx === "function"
    ? window.createLiquidFx({
      ease: 0.2,
      lensSize: 210,
      syncFps: 36,
    })
    : null;

let mirrorLayers = [];
let rafId = 0;
let running = true;
const moods = [
  "opal unrest",
  "luminous fatigue",
  "velvet voltage",
  "gilded insomnia",
  "quiet delirium",
  "hollow radiance",
  "frozen desire",
  "nocturne clarity",
  "paper thunder",
  "solar melancholy",
];

function placeTags(angleOffset) {
  if (!orbit) {
    return;
  }

  const radius = orbit.clientWidth * 0.38;

  tags.forEach((tag, i) => {
    const angle = angleOffset + (Math.PI * 2 * i) / tags.length;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const deg = (angle * 180) / Math.PI;

    tag.style.transform =
      "translate(-50%, -50%) translate(" +
      x.toFixed(1) +
      "px, " +
      y.toFixed(1) +
      "px) rotate(" +
      deg.toFixed(1) +
      "deg)";
  });
}

function setupMagnifierLayer() {
  if (!fx || !fx.enabled) {
    mirrorLayers = [];
    return;
  }

  const layerRoots = fx.buildClones({
    headerSelector: "body > header",
    mainSelector: "body > main",
  });

  mirrorLayers = layerRoots.map((container) => {
    return {
      tags: [...container.querySelectorAll(".tag")],
      run: container.querySelector("#run"),
      mood: container.querySelector("#mood"),
    };
  });

  fx.forceSync();
}

function syncMagnifier() {
  if (!mirrorLayers.length) {
    return;
  }

  for (const layer of mirrorLayers) {
    tags.forEach((tag, index) => {
      if (layer.tags[index]) {
        layer.tags[index].style.cssText = tag.style.cssText;
      }
    });

    if (layer.run && run) {
      layer.run.textContent = run.textContent;
    }

    if (layer.mood && mood) {
      layer.mood.textContent = mood.textContent;
    }
  }
}

function loop(time) {
  if (!running) {
    rafId = 0;
    return;
  }

  placeTags(time * 0.00045);
  motion.speed *= 0.82;
  motion.activity *= 0.9;

  const runValue = 153 + Math.floor((Math.sin(time * 0.0013) + 1) * 180);
  if (run) {
    run.textContent = String(runValue).padStart(4, "0");
  }

  if (mood) {
    const angleNorm = (motion.angle + Math.PI) / (Math.PI * 2);
    const movement = Math.min(1, motion.speed / 30 + motion.activity * 0.9);
    const moodRaw = angleNorm * 0.62 + movement * 1.38;
    const moodIndex = Math.floor(moodRaw * moods.length) % moods.length;
    mood.textContent = moods[(moodIndex + moods.length) % moods.length];
  }

  if (fx && fx.enabled) {
    fx.tick(time);
    if (fx.shouldSync(time)) {
      syncMagnifier();
    }
  }

  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (!rafId) {
    rafId = requestAnimationFrame(loop);
  }
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

window.addEventListener("resize", () => {
  placeTags(performance.now() * 0.00045);
  setupMagnifierLayer();
  if (fx) {
    fx.forceSync();
  }
});

window.addEventListener("pointermove", (event) => {
  const dx = event.clientX - motion.x;
  const dy = event.clientY - motion.y;
  const speed = Math.hypot(dx, dy);
  motion.x = event.clientX;
  motion.y = event.clientY;
  if (speed > 0.05) {
    motion.angle = Math.atan2(dy, dx);
  }
  motion.speed = Math.min(120, motion.speed * 0.35 + speed * 0.65);
  motion.activity = Math.min(1, motion.activity + speed / 64);
});

setupMagnifierLayer();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    running = false;
    stopLoop();
    return;
  }

  running = true;
  if (fx) {
    fx.forceSync();
  }
  startLoop();
});

startLoop();
