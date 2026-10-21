import { updateState } from "../core/gameState.js";

export function setupNavigation(render) {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      updateState((state) => ({ ...state, currentView: button.dataset.view }));
      render();
    });
  });
}