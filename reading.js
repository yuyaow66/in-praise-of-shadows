(() => {
  const initialize = () => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    let savedMode = null;
    try {
      savedMode = window.sessionStorage.getItem("readingMode");
    } catch {}
    const mode = requestedMode === "shadow" || requestedMode === "light"
      ? requestedMode
      : savedMode === "shadow" ? "shadow" : "light";
    document.body.classList.toggle("shadow-mode", mode === "shadow");
    try {
      window.sessionStorage.setItem("readingMode", mode);
    } catch {}
    document.querySelectorAll("[data-chapter-link]").forEach((link) => {
      const target = new URL(link.getAttribute("href"), window.location.href);
      target.searchParams.set("mode", mode);
      target.searchParams.set("v", "reader-4");
      link.href = target.href;
    });
    document.querySelectorAll("[data-reading-home]").forEach((link) => {
      link.href = mode === "shadow" ? "mainpageshadowmode.html" : "index.html";
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
