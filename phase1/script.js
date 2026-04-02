const scene = document.getElementById("scene");
const canvas = document.getElementById("hexCanvas");

const cellsReadout = document.getElementById("cells");
const pulseReadout = document.getElementById("pulse");
const modeReadout = document.getElementById("mode");

const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
const viewport = { width: window.innerWidth, height: window.innerHeight };
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

let ctx = null;
let width = 0;
let height = 0;
let dpr = 1;
let side = 22;
let cells = [];
let mirrorLayers = [];
let rafId = 0;
let running = true;
const moods = [
  "lucid rush",
  "velvet panic",
  "neon longing",
  "cold euphoria",
  "feral calm",
  "hollow bloom",
  "gravity drunk",
  "silent blaze",
  "fractured bliss",
  "midnight static",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setup() {
  if (!scene || !canvas) return;

  const rect = scene.getBoundingClientRect();
  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;

  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  side = clamp(width / 26, 14, 24);
  buildCells();
  setupMagnifierLayer();
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
    return {
      canvas: container.querySelector("#hexCanvas"),
      canvasCtx: null,
      readouts: {
        cells: container.querySelector("#cells"),
        pulse: container.querySelector("#pulse"),
        mode: container.querySelector("#mode"),
      },
    };
  });

  for (const layer of mirrorLayers) {
    layer.canvasCtx = layer.canvas ? layer.canvas.getContext("2d", { alpha: true }) : null;
  }

  fx.forceSync();
}

function syncMagnifier() {
  if (!mirrorLayers.length) {
    return;
  }

  for (const layer of mirrorLayers) {
    if (layer.readouts.cells && cellsReadout) {
      layer.readouts.cells.textContent = cellsReadout.textContent;
    }

    if (layer.readouts.pulse && pulseReadout) {
      layer.readouts.pulse.textContent = pulseReadout.textContent;
    }

    if (layer.readouts.mode && modeReadout) {
      layer.readouts.mode.textContent = modeReadout.textContent;
    }

    if (layer.canvas && canvas && layer.canvasCtx) {
      if (layer.canvas.width !== canvas.width || layer.canvas.height !== canvas.height) {
        layer.canvas.width = canvas.width;
        layer.canvas.height = canvas.height;
      }

      layer.canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
      layer.canvasCtx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      layer.canvasCtx.drawImage(canvas, 0, 0);
    }
  }
}

function buildCells() {
  cells = [];

  const hexH = Math.sqrt(3) * side;
  const stepX = side * 1.5;
  const stepY = hexH;
  const margin = side * 2.6;

  const cols = Math.ceil((width - margin * 2) / stepX) + 2;
  const rows = Math.ceil((height - margin * 2) / stepY) + 2;

  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const x = margin + col * stepX;
      const y = margin + row * stepY + (col % 2 ? hexH * 0.5 : 0);

      if (x > margin * 0.55 && x < width - margin * 0.55 && y > margin * 0.55 && y < height - margin * 0.55) {
        cells.push({ x, y, seed: col * 0.61 + row * 0.73 });
      }
    }
  }
}

function drawHex(x, y, r) {
  if (!ctx) return;

  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = Math.PI / 6 + i * (Math.PI / 3);
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawCube(x, y, s, lift) {
  if (!ctx) return;

  const topY = y - lift;
  const a = s * 0.72;
  const b = s * 0.44;

  const top = [
    [x, topY - b],
    [x + a, topY],
    [x, topY + b],
    [x - a, topY],
  ];

  const left = [
    top[3],
    top[2],
    [top[2][0], top[2][1] + s * 0.9],
    [top[3][0], top[3][1] + s * 0.9],
  ];

  const right = [
    top[1],
    top[2],
    [top[2][0], top[2][1] + s * 0.9],
    [top[1][0], top[1][1] + s * 0.9],
  ];

  const faces = [
    { shape: left, fill: "rgba(118, 134, 156, 0.84)" },
    { shape: right, fill: "rgba(88, 101, 121, 0.86)" },
    { shape: top, fill: "rgba(246, 250, 255, 0.9)" },
  ];

  for (const face of faces) {
    ctx.beginPath();
    face.shape.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.fillStyle = face.fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(17, 22, 30, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function render(time) {
  if (!running) {
    rafId = 0;
    return;
  }

  const nx = pointer.x / viewport.width - 0.5;
  const ny = pointer.y / viewport.height - 0.5;
  motion.speed *= 0.82;
  motion.activity *= 0.9;

  if (scene) {
    scene.style.transform =
      "perspective(1100px) rotateX(" + (-ny * 3.8).toFixed(2) + "deg) rotateY(" + (nx * 5.4).toFixed(2) + "deg)";
  }

  if (ctx) {
    ctx.clearRect(0, 0, width, height);

    let pulseTotal = 0;

    for (const cell of cells) {
      const wave = Math.sin(time * 0.0012 + cell.seed + nx * 2.6);
      const lift = 8 + wave * 5 + ny * 5;
      pulseTotal += Math.abs(wave);

      drawHex(cell.x, cell.y, side * 1.02);
      ctx.fillStyle = "rgba(236, 243, 252, 0.44)";
      ctx.fill();
      ctx.strokeStyle = "rgba(18, 23, 31, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      drawCube(cell.x, cell.y, side * 0.9, lift);
    }

    const basePulse = cells.length ? pulseTotal / cells.length : 0;
    const pulse =
      Math.round(
        clamp(
          basePulse * 240 +
            Math.abs(nx) * 72 +
            Math.abs(ny) * 88 +
            (Math.sin(time * 0.0042 + nx * 2.1) + 1) * 22,
          0,
          360
        )
      );

    if (cellsReadout) cellsReadout.textContent = String(cells.length).padStart(3, "0");
    if (pulseReadout) pulseReadout.textContent = pulse + "%";

    const angleNorm = (motion.angle + Math.PI) / (Math.PI * 2);
    const movement = clamp(motion.speed / 34 + motion.activity * 0.85, 0, 1);
    const moodRaw = angleNorm * 0.62 + movement * 1.4;
    const moodIndex = Math.floor(moodRaw * moods.length) % moods.length;
    if (modeReadout) modeReadout.textContent = moods[(moodIndex + moods.length) % moods.length];
  }

  if (fx && fx.enabled) {
    fx.tick(time);
    if (fx.shouldSync(time)) {
      syncMagnifier();
    }
  }

  rafId = requestAnimationFrame(render);
}

function startLoop() {
  if (!rafId) {
    rafId = requestAnimationFrame(render);
  }
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

window.addEventListener("pointermove", (event) => {
  const dx = event.clientX - motion.x;
  const dy = event.clientY - motion.y;
  const speed = Math.hypot(dx, dy);
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  motion.x = event.clientX;
  motion.y = event.clientY;
  if (speed > 0.05) {
    motion.angle = Math.atan2(dy, dx);
  }
  motion.speed = clamp(motion.speed * 0.35 + speed * 0.65, 0, 120);
  motion.activity = clamp(motion.activity + speed / 64, 0, 1);
});

window.addEventListener("resize", () => {
  setup();
  if (fx) {
    fx.forceSync();
  }
});

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

setup();
startLoop();
