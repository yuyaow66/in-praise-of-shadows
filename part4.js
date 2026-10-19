let selectedParagraph = 0;
let japanese = false;

function showParagraph(index) {
  selectedParagraph = index;
  document.querySelectorAll("p").forEach((paragraph) => { paragraph.style.display = "none"; });
  const paragraph = document.querySelector(`.${japanese ? "j" : "p"}${index}`);
  if (paragraph) paragraph.style.display = "block";
}

const toggle = document.getElementById("toggleButton");
if (toggle) {
  toggle.textContent = "JP";
  toggle.setAttribute("aria-label", "Read in Japanese");
  toggle.setAttribute("aria-pressed", "false");
  toggle.addEventListener("click", () => {
    japanese = !japanese;
    toggle.textContent = japanese ? "EN" : "JP";
    toggle.setAttribute("aria-label", japanese ? "Read in English" : "Read in Japanese");
    toggle.setAttribute("aria-pressed", String(japanese));
    showParagraph(selectedParagraph || 1);
  });
}

if (window.location.hash === "#end") showParagraph(5);
