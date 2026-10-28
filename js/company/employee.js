import { updateState } from "../core/gameState.js";
import { addHistoryLog } from "../history/historyManager.js";

export function getEmployeeSales(employee) {
  if (Number.isFinite(employee.sales)) return employee.sales;
  return employee.role === "マネージャー"
    ? employee.management
    : Math.max(1, Math.round(employee.management * 0.6));
}

export function hireEmployee(candidate) {
  let hired = false;
  updateState((state) => {
    if (
      state.employees.some((employee) => employee.id === candidate.id) ||
      state.funds < candidate.hireCost ||
      !state.availableEmployeeIds.includes(candidate.id) ||
      state.employeeHiresRemaining <= 0
    ) {
      return state;
    }
    hired = true;
    addHistoryLog(
      state,
      "employee",
      "社員採用",
      `${candidate.name} が入社した`
    );
    return {
      ...state,
      funds: state.funds - candidate.hireCost,
      employees: [...state.employees, { ...candidate }],
      availableEmployeeIds: state.availableEmployeeIds.filter((id) => id !== candidate.id),
      employeeHiresRemaining: state.employeeHiresRemaining - 1
    };
  });

  return hired;
}

export function offerEmployeeCandidates(candidates, count = 4, hireLimit = 2) {
  updateState((state) => {
    const selected = candidates
      .filter((candidate) =>
        !state.employees.some((employee) => employee.id === candidate.id)
        && !state.availableEmployeeIds.includes(candidate.id)
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map((candidate) => candidate.id);
    return {
      ...state,
      availableEmployeeIds: selected,
      employeeHiresRemaining: Math.min(hireLimit, selected.length)
    };
  });
}

export function getTeamPower(state) {
  return getOperationalEmployees(state)
    .reduce((total, employee) => total + employee.development + employee.management * 0.25, 0);
}

export function getSalesPower(state) {
  const salesEmployeeIds = state.salesEmployeeIds ?? [];
  return state.employees
    .filter((employee) => salesEmployeeIds.includes(employee.id))
    .reduce((total, employee) => total + getEmployeeSales(employee), 0);
}

export function getOperationalEmployees(state) {
  const salesEmployeeIds = state.salesEmployeeIds ?? [];
  return state.employees.filter((employee) => !salesEmployeeIds.includes(employee.id));
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