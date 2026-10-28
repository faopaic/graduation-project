const INITIAL_STATE = {
  year: 1,
  month: 4,
  calendarYear: 2026,
  quarter: 1,
  funds: 1000,
  reputation: 50,
  technology: 30,
  morale: 70,
  history: [],
  growthMap: [],
  employees: [],
  availableEmployeeIds: [],
  employeeHiresRemaining: 0,
  salaryPerEmployee: 24,
  salaryAdjustment: 0,
  equipmentLevel: 1,
  equipmentCondition: 100,
  activeProjects: [],
  pendingProjectRewards: [],
  qualityInvestmentRewardBonusMonths: 0,
  availableProjectIds: [],
  projectOfferProbabilityBonus: 0,
  completedProjects: 0,
  largeProjectsCompleted: 0,
  currentView: "dashboard",
  previousView: "employees",
  gameOver: false,
  finalRank: null,
  lastEventId: null,
  pendingEventIds: [],
  eventActionUnlocked: false,
  projectRewardRate: 1
};

let state = structuredClone(INITIAL_STATE);
const listeners = new Set();

export function getState() {
  return state;
}

export function resetState() {
  state = structuredClone(INITIAL_STATE);
  notify();
}

export function replaceState(nextState) {
  state = {
    ...structuredClone(INITIAL_STATE),
    ...nextState,
    equipmentLevel: Math.min(6, Math.max(1, nextState.equipmentLevel ?? INITIAL_STATE.equipmentLevel)),
    equipmentCondition: Math.min(100, Math.max(0, nextState.equipmentCondition ?? INITIAL_STATE.equipmentCondition))
  };
  notify();
}

export function updateState(updater) {
  const nextState = typeof updater === "function" ? updater(state) : { ...state, ...updater };
  state = nextState;
  notify();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener(state));
}

export function getInitialState() {
  return structuredClone(INITIAL_STATE);
}
