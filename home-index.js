(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("[data-panel-trigger]").forEach((trigger) => {
    const dialog = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!dialog) return;
    const sheet = dialog.querySelector(".index-sheet");
    const closeButton = dialog.querySelector("[data-panel-close]");
    const scrollRegion = dialog.querySelector("[data-panel-scroll]");
    if (!sheet || !closeButton) return;
    let closing = false;
    let closeTimer = 0;
    let backdropStart = false;

    const finishClose = () => {
      window.clearTimeout(closeTimer);
      closeTimer = 0;
      if (dialog.open) dialog.close();
    };

    const close = () => {
      if (!dialog.open || closing) return;
      closing = true;
      if (reduced.matches) {
        finishClose();
        return;
      }
      sheet.style.setProperty("--index-exit-from", getComputedStyle(sheet).transform);
      dialog.style.setProperty("--index-backdrop-from", getComputedStyle(dialog, "::backdrop").backgroundColor);
      dialog.classList.add("is-closing");
      closeTimer = window.setTimeout(finishClose, 320);
    };

    trigger.addEventListener("click", () => {
      if (document.querySelector(".home-panel[open]")) return;
      closing = false;
      dialog.classList.remove("is-closing");
      if (scrollRegion) scrollRegion.scrollTop = 0;
      dialog.showModal();
      trigger.setAttribute("aria-expanded", "true");
      document.documentElement.classList.add("index-is-open");
      closeButton.focus({ preventScroll: true });
    });

    closeButton.addEventListener("click", close);
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("pointerdown", (event) => {
      backdropStart = event.target === dialog;
    });
    dialog.addEventListener("click", (event) => {
      if (backdropStart && event.target === dialog) close();
      backdropStart = false;
    });
    sheet.addEventListener("animationend", (event) => {
      if (closing && event.target === sheet && event.animationName === "index-slide-out") finishClose();
    });
    dialog.addEventListener("close", () => {
      window.clearTimeout(closeTimer);
      closeTimer = 0;
      closing = false;
      backdropStart = false;
      dialog.classList.remove("is-closing");
      sheet.style.removeProperty("--index-exit-from");
      dialog.style.removeProperty("--index-backdrop-from");
      trigger.setAttribute("aria-expanded", "false");
      if (!document.querySelector(".home-panel[open]")) document.documentElement.classList.remove("index-is-open");
      trigger.focus({ preventScroll: true });
    });
    reduced.addEventListener("change", () => {
      if (reduced.matches && closing) finishClose();
    });
  });
})();
