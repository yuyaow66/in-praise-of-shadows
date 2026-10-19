(() => {
  try {
    window.sessionStorage.setItem("readingMode", document.body.classList.contains("shadow-mode") ? "shadow" : "light");
  } catch {}
  const artwork = document.querySelector(".ambient-dissolve");
  if (!artwork) return;

  const motion = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  const origin = { x: 0, y: 0, angle: 0 };
  const current = { ...origin };
  const target = { ...origin };
  let frame = 0;
  let previousTime = 0;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let reach = Math.min(92, Math.max(36, Math.min(viewportWidth, viewportHeight) * 0.14));

  const draw = () => {
    artwork.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0) rotate(${current.angle.toFixed(2)}deg)`;
  };

  const animate = (time) => {
    const elapsed = previousTime ? Math.min(time - previousTime, 48) : 16.67;
    previousTime = time;
    const positionEasing = 1 - Math.exp(-elapsed / 180);
    const angleEasing = 1 - Math.exp(-elapsed / 280);
    current.x += (target.x - current.x) * positionEasing;
    current.y += (target.y - current.y) * positionEasing;
    current.angle += (target.angle - current.angle) * angleEasing;

    if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) + Math.abs(target.angle - current.angle) < 0.05) {
      Object.assign(current, target);
      frame = 0;
      previousTime = 0;
      draw();
      return;
    }

    draw();
    frame = window.requestAnimationFrame(animate);
  };

  const start = () => {
    if (!frame) frame = window.requestAnimationFrame(animate);
  };

  const reset = (immediate = false) => {
    target.x = 0;
    target.y = 0;
    target.angle += ((-target.angle % 360) + 540) % 360 - 180;

    if (immediate || !motion.matches || document.hidden) {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      Object.assign(current, origin);
      Object.assign(target, origin);
      draw();
      return;
    }

    start();
  };

  window.addEventListener("pointermove", (event) => {
    if (!motion.matches || event.pointerType === "touch" || document.hidden) return;
    const x = Math.max(-1, Math.min(1, event.clientX / viewportWidth * 2 - 1));
    const y = Math.max(-1, Math.min(1, event.clientY / viewportHeight * 2 - 1));
    target.x = x * reach;
    target.y = y * reach;

    if (Math.hypot(x, y) > 0.12) {
      const desiredAngle = Math.atan2(y, x) * 180 / Math.PI + 112;
      target.angle += ((desiredAngle - target.angle) % 360 + 540) % 360 - 180;
    }

    start();
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => reset());
  window.addEventListener("pointercancel", () => reset());
  window.addEventListener("blur", () => reset(true));
  document.addEventListener("visibilitychange", () => reset(true));
  motion.addEventListener("change", () => reset(true));
  window.addEventListener("resize", () => {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    reach = Math.min(92, Math.max(36, Math.min(viewportWidth, viewportHeight) * 0.14));
    reset();
  }, { passive: true });
})();
