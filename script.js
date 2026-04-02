const root = document.documentElement;
const dotfield = document.getElementById("dotfield");
const slabs = [...document.querySelectorAll("[data-slab]")];
const layers = [...document.querySelectorAll("[data-layer]")];

const pointer = {
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.5,
};

const isCoarse = window.matchMedia("(pointer: coarse)").matches;
let rafId = 0;
let isRunning = true;
let lastFrame = 0;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function buildDots() {
  if (!dotfield) return;

  const area = window.innerWidth * window.innerHeight;
  const target = Math.round(area / (isCoarse ? 12000 : 7600));
  const count = Math.max(90, Math.min(isCoarse ? 150 : 240, target));
  dotfield.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.setProperty("--x", `${random(0, 100).toFixed(2)}%`);
    dot.style.setProperty("--y", `${random(0, 100).toFixed(2)}%`);
    dot.style.setProperty("--size", `${random(0.8, 5.1).toFixed(2)}px`);
    dot.style.setProperty("--alpha", `${random(0.32, 0.9).toFixed(2)}`);
    dot.style.setProperty("--blur", `${random(0, 1.3).toFixed(2)}px`);
    fragment.appendChild(dot);
  }

  dotfield.appendChild(fragment);
}

function updateLight(x, y) {
  root.style.setProperty("--mx", `${x}px`);
  root.style.setProperty("--my", `${y}px`);
}

window.addEventListener(
  "pointermove",
  (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    updateLight(pointer.x, pointer.y);
  },
  { passive: true }
);

window.addEventListener("resize", buildDots);

document.addEventListener("visibilitychange", () => {
  isRunning = !document.hidden;
  if (isRunning) {
    lastFrame = performance.now();
    rafId = requestAnimationFrame(animate);
  } else if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
});

function animate(time) {
  if (!isRunning) return;

  if (time - lastFrame < 33) {
    rafId = requestAnimationFrame(animate);
    return;
  }
  lastFrame = time;

  const nx = pointer.x / window.innerWidth - 0.5;
  const ny = pointer.y / window.innerHeight - 0.5;
  const s = 0;

  slabs.forEach((slab, index) => {
    const depth = Number(slab.dataset.depth || 12);
    const baseRotate = Number(slab.dataset.rot || 0);

    const driftX = Math.sin(time * 0.00046 + index * 1.1) * (depth * 0.42);
    const driftY = Math.cos(time * 0.00034 + index * 0.8) * (depth * 0.35);

    const tx = nx * depth * 1.2 + driftX + s * depth * 0.8;
    const ty = ny * depth + driftY + s * (index - 1) * 11;
    const rz = baseRotate + s * 8 + Math.sin(time * 0.00024 + index * 0.9) * 2.8;
    const sc = 1;

    slab.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rz.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
  });

  layers.forEach((layer, index) => {
    const depth = Number(layer.dataset.layer || 10);
    const px = nx * depth * 1.6 + s * depth * 2.3 + Math.sin(time * 0.0002 + index) * 9;
    const py = ny * depth * 1.2 + s * (index - 1) * 26 + Math.cos(time * 0.00017 + index) * 8;
    const r = s * 9 + Math.sin(time * 0.00016 + index) * 3;
    const sc = 1;

    layer.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) rotate(${r.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
  });

  if (dotfield) {
    const dotY = ny * 12;
    const dotScale = 1;
    dotfield.style.transform = `translate3d(0, ${dotY.toFixed(2)}px, 0) scale(${dotScale.toFixed(3)})`;
  }

  rafId = requestAnimationFrame(animate);
}

buildDots();
updateLight(pointer.x, pointer.y);
root.style.setProperty("--scroll", "0");
root.style.setProperty("--edge", "0.62");
lastFrame = performance.now();
rafId = requestAnimationFrame(animate);
