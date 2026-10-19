(() => {
  const nodes = [...document.querySelectorAll(".home-page .falling-text")];
  if (!nodes.length) return;
  const motion = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  const pointer = { x: 0, y: 0, active: false };
  const letters = nodes.map((node, index) => ({
    node,
    glyph: node.querySelector(".falling-glyph"),
    index,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    contact: false,
    lastHit: -Infinity
  }));
  let frame = 0;
  let previousTime = 0;
  let viewportHeight = window.innerHeight;

  const clearLetter = (letter) => {
    letter.x = letter.y = letter.vx = letter.vy = 0;
    letter.contact = false;
    letter.lastHit = -Infinity;
    letter.glyph.style.transform = "";
  };

  const reset = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    pointer.active = false;
    letters.forEach(clearLetter);
  };

  const animate = (time) => {
    if (!motion.matches || document.hidden) {
      reset();
      return;
    }
    const elapsed = previousTime ? Math.min(time - previousTime, 32) / 1000 : 1 / 60;
    previousTime = time;
    const bounds = letters.map((letter) => letter.node.getBoundingClientRect());
    let moving = false;

    letters.forEach((letter, index) => {
      const boundsForLetter = bounds[index];
      let forceX = 0;
      let forceY = 0;
      if (pointer.active && boundsForLetter.bottom > 0 && boundsForLetter.top < viewportHeight) {
        let dx = boundsForLetter.left + boundsForLetter.width / 2 + letter.x - pointer.x;
        let dy = boundsForLetter.top + boundsForLetter.height / 2 + letter.y - pointer.y;
        let distance = Math.hypot(dx, dy);
        const radius = Math.max(46, boundsForLetter.width * 0.95);
        if (distance < 0.1) {
          dx = letter.index % 2 ? 1 : -1;
          dy = -0.5;
          distance = Math.hypot(dx, dy);
        }
        if (distance < radius) {
          const directionX = dx / distance;
          const directionY = dy / distance;
          if (!letter.contact && time - letter.lastHit > 240) {
            letter.vx += directionX * 400;
            letter.vy += directionY * 400;
            letter.lastHit = time;
          }
          letter.contact = true;
          const strength = (1 - distance / radius) * 1800;
          forceX = directionX * strength;
          forceY = directionY * strength;
        } else if (distance > radius * 1.25) {
          letter.contact = false;
        }
      } else {
        letter.contact = false;
      }

      letter.vx += (forceX - letter.x * 14 - letter.vx * 5.8) * elapsed;
      letter.vy += (forceY - letter.y * 14 - letter.vy * 5.8) * elapsed;
      letter.x += letter.vx * elapsed;
      letter.y += letter.vy * elapsed;
      const offset = Math.hypot(letter.x, letter.y);
      if (offset > 160) {
        const nx = letter.x / offset;
        const ny = letter.y / offset;
        letter.x = nx * 160;
        letter.y = ny * 160;
        const outwardSpeed = letter.vx * nx + letter.vy * ny;
        if (outwardSpeed > 0) {
          letter.vx -= outwardSpeed * nx;
          letter.vy -= outwardSpeed * ny;
        }
      }
      if (Math.abs(letter.x) + Math.abs(letter.y) + Math.abs(letter.vx) + Math.abs(letter.vy) < 0.08) {
        letter.x = letter.y = letter.vx = letter.vy = 0;
      } else {
        moving = true;
      }
    });

    letters.forEach((letter) => {
      const angle = Math.max(-12, Math.min(12, letter.x * 0.12));
      letter.glyph.style.transform = `translate3d(${letter.x.toFixed(2)}px, ${letter.y.toFixed(2)}px, 0) rotate(${angle.toFixed(2)}deg)`;
    });
    if (pointer.active || moving) {
      frame = window.requestAnimationFrame(animate);
    } else {
      frame = 0;
      previousTime = 0;
    }
  };

  const start = () => {
    if (!frame) frame = window.requestAnimationFrame(animate);
  };

  window.addEventListener("pointermove", (event) => {
    if (!motion.matches || event.pointerType === "touch" || document.hidden) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    start();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    pointer.active = false;
    start();
  });
  window.addEventListener("pointercancel", reset);
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", reset);
  motion.addEventListener("change", reset);
  window.addEventListener("resize", () => {
    viewportHeight = window.innerHeight;
    reset();
  }, { passive: true });
  letters.forEach((letter) => letter.node.addEventListener("animationiteration", () => clearLetter(letter)));
})();
