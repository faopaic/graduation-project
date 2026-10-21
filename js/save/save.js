import { getState, replaceState } from "../core/gameState.js";

const SAVE_KEY = "it-company-game-save";

export function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(getState()));
}

export function loadGame() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (!saved) return false;
  try {
    replaceState(JSON.parse(saved));
    return true;
  } catch (error) {
    console.warn("セーブデータを読み込めませんでした。", error);
    return false;
  }
}