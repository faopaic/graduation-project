import { getState, replaceState } from "../core/gameState.js";

const SAVE_KEY = "it-company-game-save";

export function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(getState()));
}

export function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
}

export function loadGame() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (!saved) return false;
  try {
    replaceState(normalizeSavedState(JSON.parse(saved)));
    return true;
  } catch (error) {
    console.warn("セーブデータを読み込めませんでした。", error);
    return false;
  }
}

function normalizeSavedState(savedState) {
  const state = { ...savedState };
  if (state.funds >= 100000) {
    state.funds = Math.round(state.funds / 10000);
  }
  state.activeProjects = (state.activeProjects ?? []).map((project) => ({
    ...project,
    reward: project.reward >= 10000
      ? Math.round(project.reward / 10000)
      : project.reward
  }));
  state.growthMap = (state.growthMap ?? []).map((cell) => ({
    ...cell,
    funds: cell.funds >= 100000
      ? Math.round(cell.funds / 10000)
      : cell.funds
  }));
  return state;
}