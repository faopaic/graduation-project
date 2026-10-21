import { updateState } from "../core/gameState.js";

export function changeFunds(amount) {
  updateState((state) => ({ ...state, funds: state.funds + amount }));
}

export function changeReputation(amount) {
  updateState((state) => ({ ...state, reputation: clamp(state.reputation + amount, 0, 100) }));
}

export function changeTechnology(amount) {
  updateState((state) => ({ ...state, technology: Math.max(0, state.technology + amount) }));
}

export function paySalaries(state) {
  return state.employees.reduce((total, employee) => total + employee.salary, 0);
}

export function getCompanyRank(state) {
  if (state.reputation >= 80 && state.technology >= 65) return "大企業候補";
  if (state.reputation >= 60) return "成長企業";
  return "スタートアップ";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}