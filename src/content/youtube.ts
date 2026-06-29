const removeDistractors = () => {
  const path = window.location.pathname;
  const selectors = [
    "ytd-rich-grid-renderer",
    "ytd-reel-shelf-renderer",
    "ytd-watch-next-secondary-results-renderer",
    "ytd-guide-section-renderer",
    "ytd-mini-guide-renderer"
  ];

  if (path === "/" || path.startsWith("/shorts") || path.startsWith("/watch")) {
    selectors.forEach((selector) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.style.display = "none";
      });
    });
  }
};

removeDistractors();
new MutationObserver(removeDistractors).observe(document.documentElement, {
  childList: true,
  subtree: true
});
