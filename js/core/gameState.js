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
  employees: [],
  activeProjects: [],
  completedProjects: 0,
  largeProjectsCompleted: 0,
  currentView: "dashboard",
  gameOver: false,
  finalRank: null,
  lastEventId: null
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
  state = { ...structuredClone(INITIAL_STATE), ...nextState };
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
