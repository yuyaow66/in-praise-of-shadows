(() => {
  if (document.querySelector(".shadow-cursor")) return;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;
  canvas.className = "shadow-cursor";
  canvas.setAttribute("aria-hidden", "true");
  document.documentElement.append(canvas);
  const color = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#0d1726";
  const stamp = document.createElement("canvas");
  stamp.width = 64;
  stamp.height = 64;
  const stampContext = stamp.getContext("2d");
  if (stampContext) {
    stampContext.fillStyle = color;
    stampContext.filter = "blur(1.4px)";
    stampContext.fillRect(10, 10, 44, 44);
  }
  const nativeSurfaceSelector = "dialog[open]:not([data-shadow-cursor])";
  const lifetime = 950;
  const spacing = 20;
  const maximum = 72;
  let width = 0;
  let height = 0;
  let active = false;
  let contextAvailable = true;
  let frame = 0;
  let particles = [];
  let pointer = { x: 0, y: 0 };
  let emitter = { x: 0, y: 0 };

  const reset = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    active = false;
    particles = [];
    document.documentElement.classList.remove("shadow-cursor-active");
    context.clearRect(0, 0, width, height);
  };

  const syncSurface = () => {
    const nativeSurface = document.querySelector(nativeSurfaceSelector);
    const supportedDialogs = document.querySelectorAll("dialog[open][data-shadow-cursor]");
    const surface = nativeSurface ? document.documentElement : supportedDialogs[supportedDialogs.length - 1] || document.documentElement;
    if (canvas.parentElement !== surface) surface.append(canvas);
    if (nativeSurface) reset();
  };

  const surfaceObserver = new MutationObserver(syncSurface);
  surfaceObserver.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["open", "data-shadow-cursor"] });
  syncSurface();

  const resize = () => {
    reset();
    if (!finePointer.matches) {
      width = 0;
      height = 0;
      canvas.width = 1;
      canvas.height = 1;
      return;
    }
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const smooth = (progress) => {
    const value = Math.max(0, Math.min(1, progress));
    return value * value * (3 - 2 * value);
  };

  const square = (x, y, size, opacity) => {
    context.globalAlpha = opacity;
    if (stampContext) {
      const extent = size * 64 / 44;
      context.drawImage(stamp, x - extent / 2, y - extent / 2, extent, extent);
    } else {
      context.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }
  };

  const draw = (now) => {
    frame = 0;
    context.clearRect(0, 0, width, height);
    if (document.querySelector(nativeSurfaceSelector)) {
      reset();
      return;
    }
    if (!active || !finePointer.matches || document.hidden) return;
    context.fillStyle = color;
    particles = particles.filter((particle) => now - particle.born < lifetime);
    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index];
      const age = now - particle.born;
      const taper = Math.pow((index + 1) / (particles.length + 1), 0.55);
      const scale = (1 - smooth(age / lifetime)) * taper;
      const opacity = 0.46 * Math.pow(1 - smooth((age - 70) / (lifetime - 70)), 1.2) * smooth((index + 1) / 6);
      const size = Math.round(20 * scale);
      if (size > 0) square(particle.x, particle.y, size, opacity);
    }
    square(pointer.x, pointer.y, 22, 0.58);
    context.globalAlpha = 1;
    if (particles.length) frame = window.requestAnimationFrame(draw);
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(draw);
  };

  window.addEventListener("pointermove", (event) => {
    const nativeSurface = document.querySelector(nativeSurfaceSelector);
    if (!contextAvailable || !finePointer.matches || event.pointerType === "touch" || document.hidden || nativeSurface) {
      if (active) reset();
      return;
    }
    const now = performance.now();
    pointer = { x: event.clientX, y: event.clientY };
    if (!active) {
      active = true;
      emitter = { ...pointer, time: now };
      document.documentElement.classList.add("shadow-cursor-active");
    } else if (!reducedMotion.matches) {
      const dx = pointer.x - emitter.x;
      const dy = pointer.y - emitter.y;
      const distance = Math.hypot(dx, dy);
      const steps = Math.floor(distance / spacing);
      const segmentStart = Math.max(emitter.time, now - 80);
      for (let i = Math.max(1, steps - maximum + 1); i <= steps; i++) {
        const fraction = i * spacing / distance;
        particles.push({ x: emitter.x + dx * fraction, y: emitter.y + dy * fraction, born: segmentStart + (now - segmentStart) * fraction });
      }
      if (steps) {
        const fraction = steps * spacing / distance;
        emitter = { x: emitter.x + dx * fraction, y: emitter.y + dy * fraction, time: segmentStart + (now - segmentStart) * fraction };
      }
      if (particles.length > maximum) particles.splice(0, particles.length - maximum);
    } else {
      emitter = { ...pointer, time: now };
    }
    schedule();
  }, { passive: true });

  canvas.addEventListener("contextlost", () => {
    contextAvailable = false;
    reset();
  });
  canvas.addEventListener("contextrestored", () => {
    contextAvailable = true;
    resize();
  });
  document.documentElement.addEventListener("pointerleave", reset);
  window.addEventListener("pointercancel", reset);
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", reset);
  document.addEventListener("keydown", (event) => { if (event.key === "Tab") reset(); });
  finePointer.addEventListener("change", resize);
  reducedMotion.addEventListener("change", reset);
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pagehide", reset);
  window.addEventListener("contextmenu", reset);
  resize();
})();
