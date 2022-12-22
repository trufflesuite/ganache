function getUserColorTheme() {
  const localTheme = localStorage.getItem("theme");
  if (localTheme) {
    return localTheme;
  } else if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  } else {
    return "dark";
  }
}

(function initColorTheme() {
  const theme = getUserColorTheme();
  document.documentElement.setAttribute("data-theme", theme);
})();
