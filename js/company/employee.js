import { updateState } from "../core/gameState.js";

export function hireEmployee(candidate) {
  let hired = false;
  updateState((state) => {
    if (state.employees.some((employee) => employee.id === candidate.id) || state.funds < candidate.hireCost) return state;
    hired = true;
    return { ...state, funds: state.funds - candidate.hireCost, employees: [...state.employees, { ...candidate }] };
  });
  return hired;
}

export function getTeamPower(state) {
  return state.employees.reduce((total, employee) => total + employee.development + employee.management * 0.25, 0);
}

export function growEmployees() {
  updateState((state) => ({
    ...state,
    employees: state.employees.map((employee) => ({
      ...employee,
      development: employee.development + (employee.development < 25 ? 1 : 0)
    }))
  }));
}