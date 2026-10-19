(() => {
  const root = document.documentElement;
  if (!root.classList.contains("entry-pending")) return;

  const entry = document.getElementById("site-entry");
  const sentences = [...document.querySelectorAll("[data-entry-sentence]")];
  const skip = entry?.querySelector("[data-entry-skip]");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const regions = [...document.querySelectorAll(".home-corners, .home-intro")];
  const initialInert = regions.map((region) => region.inert);
  const previousFocus = document.activeElement;
  const animations = new Set();
  const timers = new Map();
  const listeners = new AbortController();
  let complete = false;
  let revealing = false;
  let keyboardUsed = false;
  let fitTimer = 0;

  const remember = () => {
    try {
      window.sessionStorage.setItem("in-praise-entry-v1", "seen");
    } catch {}
  };

  const finish = (restoreFocus = true) => {
    if (complete) return;
    complete = true;
    window.clearTimeout(window.__entryFailSafe);
    window.clearTimeout(fitTimer);
    delete window.__entryFailSafe;
    listeners.abort();
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    timers.forEach((resolve, timer) => {
      window.clearTimeout(timer);
      resolve();
    });
    timers.clear();
    regions.forEach((region, index) => { region.inert = initialInert[index]; });
    root.classList.remove("entry-pending", "entry-revealing");
    remember();
    const focusWasInside = entry?.contains(document.activeElement);
    entry?.remove();
    if (restoreFocus && focusWasInside) {
      const target = previousFocus instanceof HTMLElement && previousFocus !== document.body && previousFocus.isConnected && !previousFocus.closest("[inert]")
        ? previousFocus
        : keyboardUsed ? document.getElementById("about-trigger") : null;
      target?.focus({ preventScroll: true });
    }
  };

  window.clearTimeout(window.__entryFailSafe);
  window.__entryFailSafe = window.setTimeout(() => finish(), 32000);

  if (!entry || !skip || !sentences.length || motion.matches || typeof Element.prototype.animate !== "function") {
    finish(false);
    return;
  }

  const wait = (duration) => new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      resolve();
    }, duration);
    timers.set(timer, resolve);
  });

  const animate = (element, frames, options) => {
    if (complete) return Promise.resolve();
    const animation = element.animate(frames, options);
    animations.add(animation);
    return animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  };

  const announcer = document.createElement("div");
  announcer.className = "entry-announcer";
  announcer.setAttribute("role", "status");
  announcer.setAttribute("aria-live", "polite");
  announcer.setAttribute("aria-atomic", "true");
  entry.append(announcer);
  entry.hidden = false;
  entry.setAttribute("role", "dialog");
  entry.setAttribute("aria-modal", "true");
  entry.setAttribute("aria-label", "Introduction");
  entry.setAttribute("tabindex", "-1");
  regions.forEach((region) => { region.inert = true; });

  const caret = document.createElement("span");
  caret.className = "entry-caret";
  caret.setAttribute("aria-hidden", "true");

  const placeCaret = (letter, before = false) => {
    caret.classList.toggle("is-before", before);
    letter.append(caret);
  };

  const prepared = sentences.map((sentence) => {
    const text = sentence.dataset.text || sentence.textContent.trim();
    const lang = sentence.lang || sentence.closest("[lang]")?.lang || root.lang || "en";
    const cjk = /^(ja|zh|ko)(-|$)/i.test(lang) || /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
    const tokens = cjk ? Array.from(text).reduce((parts, character) => {
      if (/[、。，．！？：；）］｝〉》」』】〕〗〙〛]/u.test(character) && parts.length && !/^\s+$/.test(parts[parts.length - 1])) {
        parts[parts.length - 1] += character;
      } else {
        parts.push(character);
      }
      return parts;
    }, []) : text.split(/(\s+)/);
    const fragment = document.createDocumentFragment();
    const letters = [];
    let previousWasWord = false;
    for (const token of tokens) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        fragment.append(document.createTextNode(" "));
        previousWasWord = false;
        continue;
      }
      if (cjk && previousWasWord) fragment.append(document.createElement("wbr"));
      const word = document.createElement("span");
      word.className = "entry-word";
      const characters = Array.from(token);
      for (let characterIndex = 0; characterIndex < characters.length; characterIndex += 1) {
        const character = characters[characterIndex];
        const letter = document.createElement("span");
        letter.className = "entry-letter";
        letter.textContent = character;
        word.append(letter);
        letters.push({
          node: letter,
          character,
          wordEnd: !cjk && characterIndex === characters.length - 1
        });
      }
      fragment.append(word);
      previousWasWord = true;
    }
    sentence.replaceChildren(fragment);
    sentence.setAttribute("aria-hidden", "true");
    return { sentence, letters, text, lang };
  });

  const fitSentences = () => {
    if (complete || revealing) return;
    const stage = entry.querySelector(".entry-stage");
    if (!stage) return;
    const style = window.getComputedStyle(stage);
    const width = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 4;
    const height = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 4;
    if (width <= 0 || height <= 0) return;
    prepared.forEach(({ sentence }) => {
      const words = [...sentence.querySelectorAll(".entry-word")];
      let lower = 16;
      let upper = Math.max(width, height) * 2;
      let best = lower;
      for (let attempt = 0; attempt < 13 && upper - lower > 0.5; attempt += 1) {
        const size = (lower + upper) / 2;
        sentence.style.fontSize = `${size}px`;
        const widestWord = Math.max(...words.map((word) => word.getBoundingClientRect().width));
        if (widestWord <= width && sentence.getBoundingClientRect().height <= height) {
          best = size;
          lower = size;
        } else {
          upper = size;
        }
      }
      sentence.style.fontSize = `${Math.floor(best)}px`;
    });
  };

  const scheduleFit = () => {
    window.clearTimeout(fitTimer);
    fitTimer = window.setTimeout(fitSentences, 80);
  };

  window.addEventListener("resize", scheduleFit, { passive: true, signal: listeners.signal });
  document.fonts?.addEventListener("loadingdone", scheduleFit, { signal: listeners.signal });

  const reveal = async (duration) => {
    if (complete || revealing) return;
    revealing = true;
    entry.dataset.phase = "revealing";
    caret.remove();
    animations.forEach((animation) => animation.cancel());
    root.classList.add("entry-revealing");
    await animate(entry, [{ opacity: 1 }, { opacity: 0 }], {
      duration,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards"
    });
    finish();
  };

  const skipEntry = () => {
    if (revealing) finish();
    else void reveal(240);
  };

  skip.addEventListener("click", skipEntry, { signal: listeners.signal });
  document.addEventListener("keydown", (event) => {
    if (complete) return;
    if (event.key === "Escape") {
      keyboardUsed = true;
      event.preventDefault();
      skipEntry();
    } else if (event.key === "Tab") {
      keyboardUsed = true;
      event.preventDefault();
      skip.focus({ preventScroll: true });
    }
  }, { capture: true, signal: listeners.signal });
  motion.addEventListener("change", () => {
    if (motion.matches) finish();
  }, { signal: listeners.signal });
  window.addEventListener("pagehide", () => finish(false), { once: true, signal: listeners.signal });
  entry.focus({ preventScroll: true });

  const run = async () => {
    try {
      const fontWait = document.fonts?.ready || Promise.resolve();
      await Promise.race([fontWait, wait(700)]);
      if (complete || revealing) return;
      fitSentences();
      for (let index = 0; index < prepared.length; index += 1) {
        const { sentence, letters, text, lang } = prepared[index];
        if (complete || revealing) return;
        entry.dataset.phase = `sentence-${index + 1}-in`;
        sentence.classList.add("is-active");
        announcer.lang = lang;
        announcer.textContent = text;
        placeCaret(letters[0].node, true);
        caret.classList.remove("is-blinking");
        for (let letterIndex = 0; letterIndex < letters.length; letterIndex += 1) {
          if (complete || revealing) return;
          const letter = letters[letterIndex];
          letter.node.classList.add("is-typed");
          placeCaret(letter.node);
          const cadence = [154, 146, 162, 150, 168, 156][letterIndex % 6];
          const punctuationPause = /[.!?。！？]/u.test(letter.character) ? 260 : /[,;:、，；：]/u.test(letter.character) ? 140 : 0;
          const wordPause = letter.wordEnd && letterIndex < letters.length - 1 ? 100 : 0;
          await wait(cadence + punctuationPause + wordPause);
        }
        if (complete || revealing) return;
        entry.dataset.phase = `sentence-${index + 1}-hold`;
        caret.classList.add("is-blinking");
        await wait(1950);
        if (complete || revealing) return;
        entry.dataset.phase = `sentence-${index + 1}-out`;
        caret.classList.remove("is-blinking");
        for (let letterIndex = letters.length - 1; letterIndex >= 0; letterIndex -= 1) {
          if (complete || revealing) return;
          letters[letterIndex].node.classList.remove("is-typed");
          placeCaret(letters[Math.max(0, letterIndex - 1)].node, letterIndex === 0);
          await wait([78, 86, 82, 88][letterIndex % 4]);
        }
        caret.remove();
        sentence.classList.remove("is-active");
        if (complete || revealing) return;
        if (index < prepared.length - 1) await wait(500);
      }
      if (!complete && !revealing) await reveal(2000);
    } catch {
      finish();
    }
  };

  void run();
})();
