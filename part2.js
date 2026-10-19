document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => {
    document.querySelectorAll(".door-left, .door-right").forEach((door) => door.classList.add("open"));
    document.querySelector(".content")?.classList.add("visible");
  }, reduceMotion ? 0 : 1000);
  const toggle = document.getElementById("toggleButton");
  if (!toggle) return;
  toggle.textContent = "JP";
  toggle.setAttribute("aria-label", "Read in Japanese");
  toggle.setAttribute("aria-pressed", "false");
  toggle.addEventListener("click", () => {
    const japanese = document.body.classList.toggle("language-japanese");
    toggle.textContent = japanese ? "EN" : "JP";
    toggle.setAttribute("aria-label", japanese ? "Read in English" : "Read in Japanese");
    toggle.setAttribute("aria-pressed", String(japanese));
  });
});
