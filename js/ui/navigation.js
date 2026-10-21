import { updateState } from "../core/gameState.js";

export function setupNavigation(render) {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-button").forEach((item) => item.classList.toggle("active", item === button));
      updateState((state) => ({ ...state, currentView: button.dataset.view }));
      render();
    });
  });
}