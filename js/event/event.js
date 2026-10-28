import { updateState } from "../core/gameState.js";
import { addHistoryLog } from "../history/historyManager.js";

const INCIDENT_EMPLOYEES = {
  engineer: {
    id: "incident_engineer",
    name: "応募エンジニア",
    role: "エンジニア",
    development: 12,
    design: 6,
    management: 5,
    salary: 35,
    hireCost: 0
  },
  support: {
    id: "incident_support",
    name: "追加採用スタッフ",
    role: "エンジニア",
    development: 8,
    design: 5,
    management: 4,
    salary: 30,
    hireCost: 0
  }
};

export function chooseEvents(events, state) {
  const options = events.filter((event) => {
    if (event.id === state.lastEventId) return false;
    if (event.id === "company_005") return false;
    return event.category !== "projects" || state.activeProjects.length > 0;
  }).filter((event) => {
    const probability = Number(event.probability);
    return Number.isFinite(probability) && probability > 0 && Math.random() * 100 < probability;
  });
  if (state.month === 4) {
    const equipmentEvent = events.find((event) => event.id === "company_005");
    if (equipmentEvent && equipmentEvent.id !== state.lastEventId) {
      return [...options, equipmentEvent];
    }
  }
  return options;
}

export function chooseEvent(events, state) {
  return chooseEvents(events, state)[0] ?? null;
}

export function applyEventChoice(choice) {
  updateState((state) => {
    const effects = choice.effects ?? {};
    const equipmentLevelIncrease = effects.equipmentLevel ?? 0;
    const qualityInvestmentRewardBonusMonths = effects.qualityInvestment && (state.qualityInvestmentRewardBonusMonths ?? 0) === 0
      ? 12
      : (state.qualityInvestmentRewardBonusMonths ?? 0);
    const qualityInvestmentCost = effects.qualityInvestment
      ? state.employees.length * 30 + 10
      : 0;
    const hiredEmployee = effects.hireEmployee ? INCIDENT_EMPLOYEES[effects.hireEmployee] : null;
    const employees = hiredEmployee && !state.employees.some((employee) => employee.id === hiredEmployee.id)
      ? [...state.employees, hiredEmployee]
      : effects.removeEmployee && state.employees.length > 0
        ? state.employees.slice(0, -1)
        : state.employees;
    if (hiredEmployee) {
      addHistoryLog(state, "employee", "社員採用", `${hiredEmployee.name}が入社した`);
    } else if (effects.removeEmployee && state.employees.length > 0) {
      addHistoryLog(state, "employee", "社員退職", "社員が退職した");
    }
    return {
      ...state,
      funds: state.funds + (effects.funds ?? 0) - qualityInvestmentCost,
      reputation: Math.min(100, Math.max(0, state.reputation + adjustPositiveEffect(effects.reputation))),
      technology: Math.max(0, state.technology + adjustPositiveEffect(effects.technology)),
      morale: Math.min(100, Math.max(0, state.morale + adjustPositiveEffect(effects.morale))),
      employees,
      qualityInvestmentRewardBonusMonths,
      salaryAdjustment: (state.salaryAdjustment ?? 0) + (effects.salaryAdjustment ?? 0),
      equipmentLevel: Math.min(6, (state.equipmentLevel ?? 1) + equipmentLevelIncrease),
      equipmentCondition: equipmentLevelIncrease > 0 ? 100 : (state.equipmentCondition ?? 100),
      projectOfferProbabilityBonus: Math.min(
        1,
        (state.projectOfferProbabilityBonus ?? 0) + (effects.projectOfferProbabilityBonus ?? 0)
      ),
      projectRewardRate: Math.max(0.5, (state.projectRewardRate ?? 1) + (effects.projectRewardRate ?? 0)),
      lastEventId: null,
      eventActionUnlocked: true
    };
  });
}

export function markEventShown(eventId) {
  updateState((state) => ({ ...state, lastEventId: eventId }));
}

function adjustPositiveEffect(value) {
  const effect = Number(value) || 0;
  return effect > 0 ? Math.round(effect * 0.5) : effect;
}