(() => {
  const article = document.querySelector("[data-passage-reader]");
  if (!article) return;
  const chapter = document.body.dataset.chapter;
  const compact = window.matchMedia("(max-width: 600px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sources = [...article.querySelectorAll("p")].map((paragraph) => [...paragraph.childNodes].map((node) => node.nodeName === "BR" ? "\n" : node.textContent).join("").trim());
  const dots = document.querySelector(".passage-dots");
  const picker = document.getElementById("passage-picker");
  const dialog = document.getElementById("passage-dialog");
  const choices = document.querySelector(".passage-choices");
  const previous = document.getElementById("previous-passage");
  const next = document.getElementById("next-passage");
  const previousChapter = document.getElementById("previous-chapter");
  const nextChapter = document.getElementById("next-chapter");
  const status = document.getElementById("passage-status");
  const credit = document.querySelector(".reading-credit");
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("en", { granularity: "sentence" }) : null;
  const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;
  let pages = [];
  let panels = [];
  let active = 0;
  let textAnimation = null;

  const splitParagraph = (text, limit) => {
    if (countWords(text) <= limit) return [text];
    const sentences = segmenter ? [...segmenter.segment(text)].map((entry) => entry.segment) : text.split(/(?<=[.!?])\s+/).map((sentence) => `${sentence} `);
    const units = sentences.flatMap((sentence) => {
      if (countWords(sentence) <= limit * 1.4) return [sentence];
      const words = sentence.match(/\S+\s*/g) || [];
      const parts = [];
      for (let i = 0; i < words.length; i += limit) parts.push(words.slice(i, i + limit).join(""));
      return parts;
    });
    const fragments = [];
    let current = "";
    for (const unit of units) {
      if (current && countWords(current + unit) > limit) {
        fragments.push(current.trim());
        current = "";
      }
      current += unit;
    }
    if (current.trim()) fragments.push(current.trim());
    return fragments;
  };

  const makePages = () => {
    const limit = compact.matches ? 115 : 200;
    const result = [];
    let current = [];
    let currentWords = 0;
    let start = 0;
    for (const paragraph of sources) {
      for (const fragment of splitParagraph(paragraph, limit)) {
        const words = countWords(fragment);
        if (current.length && currentWords + words > limit) {
          result.push({ paragraphs: current, start, words: currentWords });
          start += currentWords;
          current = [];
          currentWords = 0;
        }
        current.push(fragment);
        currentWords += words;
      }
    }
    if (current.length) result.push({ paragraphs: current, start, words: currentWords });
    return result;
  };

  const appendText = (element, text) => {
    text.split("\n").forEach((line, index) => {
      if (index) element.append(document.createElement("br"));
      element.append(document.createTextNode(line));
    });
  };

  const renderDots = () => {
    const oldFocus = document.activeElement;
    const focusedIndex = oldFocus?.dataset.passageIndex;
    const start = Math.max(0, Math.min(active - 2, pages.length - 5));
    const fragment = document.createDocumentFragment();
    for (let i = start; i < Math.min(start + 5, pages.length); i++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "circle-button passage-dot";
      button.dataset.passageIndex = String(i);
      button.setAttribute("aria-label", `Read passage ${i + 1} of ${pages.length}`);
      button.title = `${i + 1} / ${pages.length}`;
      if (i === active) button.setAttribute("aria-current", "true");
      button.addEventListener("click", () => show(i));
      fragment.append(button);
    }
    dots.replaceChildren(fragment);
    if (focusedIndex !== undefined) {
      dots.querySelector('[aria-current="true"]').focus({ preventScroll: true });
    }
  };

  const show = (index, options = {}) => {
    active = Math.max(0, Math.min(index, pages.length - 1));
    const previousFocus = document.activeElement;
    panels.forEach((panel, i) => { panel.hidden = i !== active; });
    picker.textContent = `${active + 1} / ${pages.length}`;
    picker.setAttribute("aria-label", `Choose passage, ${active + 1} of ${pages.length}`);
    previous.hidden = active === 0;
    previousChapter.hidden = active !== 0;
    next.hidden = active === pages.length - 1;
    nextChapter.hidden = active !== pages.length - 1;
    credit.hidden = active !== pages.length - 1;
    if (previousFocus === previous && previous.hidden) previousChapter.focus({ preventScroll: true });
    if (previousFocus === next && next.hidden) nextChapter.focus({ preventScroll: true });
    if (previousFocus === previousChapter && previousChapter.hidden) previous.focus({ preventScroll: true });
    if (previousFocus === nextChapter && nextChapter.hidden) next.focus({ preventScroll: true });
    status.textContent = `Passage ${active + 1} of ${pages.length}`;
    renderDots();
    try { window.sessionStorage.setItem(`reading-position-${chapter}`, String(pages[active].start)); } catch {}
    if (options.updateUrl !== false) {
      const url = new URL(window.location.href);
      url.hash = `passage-${active + 1}`;
      window.history.replaceState(null, "", url);
    }
    textAnimation?.cancel();
    if (options.animate !== false && !reduced.matches) {
      textAnimation = panels[active].animate([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 320, easing: "ease-out" });
    }
    if (options.scroll !== false) window.scrollTo(0, 0);
  };

  const build = (wordPosition = null) => {
    pages = makePages();
    const fragment = document.createDocumentFragment();
    panels = pages.map((page, index) => {
      const section = document.createElement("section");
      section.className = "reading-passage";
      section.id = `reading-passage-${index + 1}`;
      section.setAttribute("aria-label", `Passage ${index + 1} of ${pages.length}`);
      section.hidden = true;
      page.paragraphs.forEach((text) => {
        const paragraph = document.createElement("p");
        appendText(paragraph, text);
        section.append(paragraph);
      });
      fragment.append(section);
      return section;
    });
    article.replaceChildren(fragment);
    let index = 0;
    if (wordPosition !== null) {
      index = Math.max(0, pages.findIndex((page) => page.start + page.words > wordPosition));
    } else if (window.location.hash === "#end") {
      index = pages.length - 1;
    } else if (/^#passage-\d+$/.test(window.location.hash)) {
      index = Number(window.location.hash.slice(9)) - 1;
    } else if (window.location.hash !== "#start") {
      try {
        const saved = Number(window.sessionStorage.getItem(`reading-position-${chapter}`) || 0);
        index = Math.max(0, pages.findIndex((page) => page.start + page.words > saved));
      } catch {}
    }
    show(index, { animate: false, scroll: false });
    document.body.classList.add("reader-ready");
  };

  previous.addEventListener("click", () => show(active - 1));
  next.addEventListener("click", () => show(active + 1));
  picker.addEventListener("click", () => {
    const fragment = document.createDocumentFragment();
    pages.forEach((page, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "passage-option";
      button.textContent = String(index + 1);
      button.setAttribute("aria-label", `Read passage ${index + 1} of ${pages.length}`);
      if (index === active) button.setAttribute("aria-current", "true");
      button.addEventListener("click", () => {
        show(index);
        dialog.close();
      });
      fragment.append(button);
    });
    choices.replaceChildren(fragment);
    dialog.showModal();
    choices.querySelector('[aria-current="true"]')?.focus();
  });
  document.getElementById("close-passages").addEventListener("click", () => dialog.close());
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || dialog.open || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || window.getSelection()?.toString() || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (active < pages.length - 1) show(active + 1);
      else window.location.assign(nextChapter.href);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (active > 0) show(active - 1);
      else window.location.assign(previousChapter.href);
    }
  });
  compact.addEventListener("change", () => {
    if (dialog.open) dialog.close();
    build(pages[active].start);
  });
  reduced.addEventListener("change", () => textAnimation?.cancel());
  window.addEventListener("hashchange", () => {
    if (/^#passage-\d+$/.test(window.location.hash)) show(Number(window.location.hash.slice(9)) - 1);
  });
  build();
})();
