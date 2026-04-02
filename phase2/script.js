const panel = document.getElementById("panel");
const mesh = document.getElementById("mesh");
const blades = [...document.querySelectorAll("[data-blade]")];

const tilt = document.getElementById("tilt");
const density = document.getElementById("density");
const mode = document.getElementById("mode");

const target = { x: 0.5, y: 0.5 };
const smooth = { x: 0.5, y: 0.5 };
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
  "electric poise",
  "cinematic dread",
  "powder calm",
  "metallic hope",
  "afterimage ache",
  "hushed velocity",
  "satin paranoia",
  "dry thunder",
  "voltage nostalgia",
  "amber vertigo",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildMesh() {
  if (!mesh || !panel) {
    return;
  }

  const rect = panel.getBoundingClientRect();
  const cols = Math.max(12, Math.min(30, Math.floor(rect.width / 34)));
  const rows = Math.max(8, Math.min(20, Math.floor(rect.height / 34)));

  mesh.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let y = 0; y <= rows; y += 1) {
    for (let x = 0; x <= cols; x += 1) {
      const dot = document.createElement("span");
      dot.className = "mesh-dot";
      dot.style.left = ((x / cols) * 100).toFixed(3) + "%";
      dot.style.top = ((y / rows) * 100).toFixed(3) + "%";
      dot.style.opacity = ((x + y) % 3 === 0 ? 0.34 : 0.18).toFixed(2);
      fragment.appendChild(dot);
    }
  }

  mesh.appendChild(fragment);
}

function setTargetFromPointer(event) {
  if (!panel) {
    return;
  }

  const dx = event.clientX - motion.x;
  const dy = event.clientY - motion.y;
  const speed = Math.hypot(dx, dy);
  motion.x = event.clientX;
  motion.y = event.clientY;
  if (speed > 0.05) {
    motion.angle = Math.atan2(dy, dx);
  }
  motion.speed = clamp(motion.speed * 0.35 + speed * 0.65, 0, 120);
  motion.activity = clamp(motion.activity + speed / 64, 0, 1);

  const rect = panel.getBoundingClientRect();
  target.x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  target.y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
}

if (panel) {
  panel.addEventListener("pointermove", setTargetFromPointer);
  panel.addEventListener("pointerleave", () => {
    target.x = 0.5;
    target.y = 0.5;
    motion.speed *= 0.4;
    motion.activity *= 0.5;
  });
}

function setupMagnifierLayer() {
  if (!fx || !fx.enabled) {
    mirrorLayers = [];
    return;
  }

  const layerRoots = fx.buildClones({
    headerSelector: "body > header.topbar",
    mainSelector: "body > main.page",
  });

  mirrorLayers = layerRoots.map((container) => {
    const mirrorMesh = container.querySelector("#mesh");
    if (mirrorMesh && mesh) {
      mirrorMesh.innerHTML = mesh.innerHTML;
    }

    return {
      blades: [...container.querySelectorAll("[data-blade]")],
      readout: {
        tilt: container.querySelector("#tilt"),
        density: container.querySelector("#density"),
        mode: container.querySelector("#mode"),
      },
    };
  });

  fx.forceSync();
}

function syncMagnifier() {
  if (!mirrorLayers.length) {
    return;
  }

  for (const layer of mirrorLayers) {
    blades.forEach((blade, index) => {
      if (layer.blades[index]) {
        layer.blades[index].style.cssText = blade.style.cssText;
      }
    });

    if (layer.readout.tilt && tilt) {
      layer.readout.tilt.textContent = tilt.textContent;
    }

    if (layer.readout.density && density) {
      layer.readout.density.textContent = density.textContent;
    }

    if (layer.readout.mode && mode) {
      layer.readout.mode.textContent = mode.textContent;
    }
  }
}

window.addEventListener("resize", () => {
  buildMesh();
  setupMagnifierLayer();
  if (fx) {
    fx.forceSync();
  }
});

buildMesh();
setupMagnifierLayer();

const baseAngles = [-17, 11, -8, 18];
const baseY = [26, 42, 61, 78];

function animate(time) {
  if (!running) {
    rafId = 0;
    return;
  }

  smooth.x += (target.x - smooth.x) * 0.09;
  smooth.y += (target.y - smooth.y) * 0.09;
  motion.speed *= 0.82;
  motion.activity *= 0.9;

  const nx = smooth.x - 0.5;
  const ny = smooth.y - 0.5;

  blades.forEach((blade, index) => {
    const wave = Math.sin(time * 0.00072 + index * 1.3) * 4.2;
    const driftX = nx * (26 + index * 8);
    const driftY = ny * (index % 2 === 0 ? -18 : 18);
    const angle = baseAngles[index] + wave + nx * 10;

    blade.style.top = baseY[index] + ny * 2 + "%";
    blade.style.transform =
      "translate(-50%, -50%) translate(" +
      driftX.toFixed(2) +
      "px, " +
      driftY.toFixed(2) +
      "px) rotate(" +
      angle.toFixed(2) +
      "deg)";
  });

  const tiltValue = nx * 12 + Math.sin(time * 0.0011) * 1.5;
  const densityValue = 44 + Math.abs(Math.sin(time * 0.0017 + nx * 1.4)) * 44;

  if (tilt) {
    tilt.textContent = (tiltValue >= 0 ? "+" : "") + tiltValue.toFixed(1) + "°";
  }

  if (density) {
    density.textContent = densityValue.toFixed(0) + "%";
  }

  const angleNorm = (motion.angle + Math.PI) / (Math.PI * 2);
  const movement = clamp(motion.speed / 30 + motion.activity * 0.92, 0, 1);
  const moodRaw = angleNorm * 0.6 + movement * 1.42;
  const moodIndex = Math.floor(moodRaw * moods.length) % moods.length;
  if (mode) {
    mode.textContent = moods[(moodIndex + moods.length) % moods.length];
  }

  if (fx && fx.enabled) {
    fx.tick(time);
    if (fx.shouldSync(time)) {
      syncMagnifier();
    }
  }

  rafId = requestAnimationFrame(animate);
}

function startLoop() {
  if (!rafId) {
    rafId = requestAnimationFrame(animate);
  }
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

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
