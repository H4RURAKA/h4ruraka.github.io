(function () {
  function createLiquidFx(options) {
    const config = options || {};
    const root = config.root || document.documentElement;
    const lens = document.querySelector(".water-lens");
    const layerRoots = [document.getElementById("magnifyContent"), document.getElementById("magnifyContentCore")].filter(
      Boolean
    );

    const coarsePointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    const enabled = Boolean(root && lens && layerRoots.length) && !coarsePointer;

    if (root && root.classList && !enabled) {
      root.classList.remove("fx-idle");
    }

    const state = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      tx: window.innerWidth * 0.5,
      ty: window.innerHeight * 0.5,
      px: null,
      py: null,
      pt: 0,
      motion: 0,
      motionTarget: 0,
      active: false,
      visible: false,
    };

    const lensSize = config.lensSize || 210;
    const ease = config.ease || 0.2;
    const settleEpsilon = config.settleEpsilon || 0.2;
    const syncFps = config.syncFps || 36;
    const syncInterval = 1000 / syncFps;

    const lastApplied = {
      x: null,
      y: null,
      size: null,
      opacity: null,
      motion: null,
    };

    let lastSyncAt = 0;
    let forceSyncFlag = true;

    function updateIdleClass() {
      if (!root || !root.classList || !enabled) {
        return;
      }

      if (state.visible || state.active) {
        root.classList.remove("fx-idle");
      } else {
        root.classList.add("fx-idle");
      }
    }

    function applyCssVars() {
      const xValue = state.x.toFixed(2) + "px";
      const yValue = state.y.toFixed(2) + "px";
      const sizeValue = state.visible ? lensSize + "px" : "0px";
      const opacityValue = state.visible ? "1" : "0";
      const motionValue = state.motion.toFixed(3);

      if (xValue !== lastApplied.x) {
        root.style.setProperty("--lens-x", xValue);
        lastApplied.x = xValue;
      }

      if (yValue !== lastApplied.y) {
        root.style.setProperty("--lens-y", yValue);
        lastApplied.y = yValue;
      }

      if (sizeValue !== lastApplied.size) {
        root.style.setProperty("--lens-size", sizeValue);
        lastApplied.size = sizeValue;
      }

      if (opacityValue !== lastApplied.opacity) {
        root.style.setProperty("--lens-opacity", opacityValue);
        lastApplied.opacity = opacityValue;
      }

      if (motionValue !== lastApplied.motion) {
        root.style.setProperty("--fx-motion", motionValue);
        lastApplied.motion = motionValue;
      }

      updateIdleClass();
    }

    function setTarget(x, y, activate) {
      state.tx = x;
      state.ty = y;

      if (activate !== false) {
        state.active = true;
        state.visible = true;
      }

      forceSyncFlag = true;
    }

    function setActive(value) {
      state.active = Boolean(value);

      if (state.active) {
        state.visible = true;
      }

      forceSyncFlag = true;
    }

    function registerVelocity(x, y) {
      const now = performance.now();

      if (state.px === null || state.py === null || !state.pt) {
        state.px = x;
        state.py = y;
        state.pt = now;
        return;
      }

      const dt = Math.max(16, now - state.pt);
      const dist = Math.hypot(x - state.px, y - state.py);
      const velocity = dist / dt;
      const impulse = Math.min(1.4, velocity * 3.6);

      state.motionTarget = Math.min(1.4, state.motionTarget + impulse * 0.9);

      state.px = x;
      state.py = y;
      state.pt = now;
    }

    function tick(now) {
      if (!enabled) {
        return false;
      }

      const previousX = state.x;
      const previousY = state.y;

      state.x += (state.tx - state.x) * ease;
      state.y += (state.ty - state.y) * ease;
      state.motion += (state.motionTarget - state.motion) * 0.22;
      state.motionTarget *= state.active ? 0.84 : 0.72;

      if (state.motion < 0.0015 && state.motionTarget < 0.0015) {
        state.motion = 0;
        state.motionTarget = 0;
      }

      if (!state.active) {
        const dx = Math.abs(state.tx - state.x);
        const dy = Math.abs(state.ty - state.y);

        if (dx + dy < settleEpsilon) {
          state.visible = false;
        }
      }

      const moved = Math.abs(previousX - state.x) + Math.abs(previousY - state.y) > 0.04;
      if (moved) {
        forceSyncFlag = true;
      }

      applyCssVars();

      if (typeof now === "number" && now - lastSyncAt > 4000) {
        lastSyncAt = now;
      }

      return state.visible;
    }

    function shouldSync(now) {
      if (!enabled || !state.visible) {
        return false;
      }

      const currentTime = typeof now === "number" ? now : performance.now();

      if (forceSyncFlag || currentTime - lastSyncAt >= syncInterval) {
        forceSyncFlag = false;
        lastSyncAt = currentTime;
        return true;
      }

      return false;
    }

    function forceSync() {
      forceSyncFlag = true;
    }

    function buildClones(params) {
      const optionsForClone = params || {};
      const headerSelector = optionsForClone.headerSelector || "body > header";
      const mainSelector = optionsForClone.mainSelector || "body > main";

      const sourceHeader = document.querySelector(headerSelector);
      const sourceMain = document.querySelector(mainSelector);

      const clonedRoots = [];

      for (const container of layerRoots) {
        container.innerHTML = "";

        if (sourceHeader) {
          container.appendChild(sourceHeader.cloneNode(true));
        }

        if (sourceMain) {
          container.appendChild(sourceMain.cloneNode(true));
        }

        clonedRoots.push(container);
      }

      forceSyncFlag = true;
      return clonedRoots;
    }

    function handlePointerMove(event) {
      registerVelocity(event.clientX, event.clientY);
      setTarget(event.clientX, event.clientY, true);
    }

    function handlePointerOut(event) {
      if (!event.relatedTarget) {
        setActive(false);
        state.px = null;
        state.py = null;
        state.pt = 0;
        state.motionTarget *= 0.6;
      }
    }

    function handleBlur() {
      setActive(false);
      state.px = null;
      state.py = null;
      state.pt = 0;
      state.motionTarget *= 0.6;
    }

    if (enabled && config.pointerTracking !== false) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerout", handlePointerOut, { passive: true });
      window.addEventListener("blur", handleBlur, { passive: true });
    }

    applyCssVars();

    return {
      enabled,
      state,
      buildClones,
      forceSync,
      getLayerRoots: function () {
        return layerRoots.slice();
      },
      setActive,
      setTarget,
      shouldSync,
      tick,
    };
  }

  window.createLiquidFx = createLiquidFx;
})();
