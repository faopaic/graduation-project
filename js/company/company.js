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
  const salaryPerEmployee = (state.salaryPerEmployee ?? 24) + (state.salaryAdjustment ?? 0);
  const monthlySalary = state.employees.length * salaryPerEmployee;
  const bonus = state.month === 4 || state.month === 10 ? monthlySalary * 4 : 0;
  return Math.round((monthlySalary + bonus) * 100) / 100;
}

export function getCompanyRank(state) {
  const equipmentLevel = state.equipmentLevel ?? 1;
  const employees = state.employees ?? [];
  const completedProjects = state.completedProjects ?? 0;
  const hasStartedBusiness = equipmentLevel > 1 || employees.length > 0 || completedProjects > 0;
  if (!hasStartedBusiness) {
    return "創業期";
  }
  if (equipmentLevel >= 6 || (state.reputation >= 95 && state.technology >= 90)) return "大企業";
  if (equipmentLevel >= 4 || (state.reputation >= 80 && state.technology >= 65)) return "大企業候補";
  if (equipmentLevel >= 3 || state.reputation >= 70 || state.technology >= 55) return "有力企業";
  if (equipmentLevel >= 2 || state.reputation >= 60 || state.technology >= 40) return "成長企業";
  if (state.reputation >= 35 || state.technology >= 25) return "小規模企業";
  return "創業期";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}