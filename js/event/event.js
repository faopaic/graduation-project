import { updateState } from "../core/gameState.js";

export function shouldTriggerEvent(state) {
  return !state.lastEventId && Math.random() < 0.45;
}

export function chooseEvent(events, state) {
  const options = events.filter((event) => {
    if (event.id === state.lastEventId) return false;
    return event.category !== "projects" || state.activeProjects.length > 0;
  });
  return options[Math.floor(Math.random() * options.length)] ?? null;
}

export function applyEventChoice(choice, employees = [], projects = []) {
  updateState((state) => {
    const effects = choice.effects ?? {};
    let nextEmployees = state.employees;
    let eventFunds = effects.funds ?? 0;
    if (effects.hireEmployeeId) {
      const candidate = employees.find((employee) => employee.id === effects.hireEmployeeId);
      if (
        candidate &&
        !state.employees.some((employee) => employee.id === candidate.id) &&
        state.funds + eventFunds >= candidate.hireCost
      ) {
        nextEmployees = [...state.employees, { ...candidate }];
        eventFunds -= candidate.hireCost;
      }
    }
    if (effects.removeEmployee && nextEmployees.length > 0) {
      const employee = [...nextEmployees].sort((a, b) => a.development - b.development)[0];
      nextEmployees = nextEmployees.filter((item) => item.id !== employee.id);
    }
    if (effects.employeeDevelopment) {
      nextEmployees = nextEmployees.map((employee) => ({
        ...employee,
        development: employee.development + effects.employeeDevelopment
      }));
    }
    let activeProjects = state.activeProjects;
    if (effects.projectId && projects.length > 0) {
      const project = projects.find((item) => item.id === effects.projectId);
      const assignedEmployees = activeProjects.reduce(
        (total, active) => total + (active.requiredEmployees ?? 1),
        0
      );
      if (
        project &&
        !activeProjects.some((active) => active.projectId === project.id) &&
        assignedEmployees + project.requiredEmployees <= nextEmployees.length
      ) {
        activeProjects = [...activeProjects, {
          projectId: project.id,
          name: project.name,
          monthsRemaining: project.duration,
          totalMonths: project.duration,
          reward: project.reward,
          large: project.large,
          requiredEmployees: project.requiredEmployees
        }];
      }
    }
    return {
      ...state,
      funds: Math.max(0, state.funds + eventFunds),
      reputation: Math.min(100, Math.max(0, state.reputation + (effects.reputation ?? 0))),
      technology: Math.max(0, state.technology + (effects.technology ?? 0)),
      morale: Math.min(100, Math.max(0, state.morale + (effects.morale ?? 0))),
      employees: nextEmployees,
      activeProjects,
      lastEventId: null
    };
  });
}

export function markEventShown(eventId) {
  updateState((state) => ({ ...state, lastEventId: eventId }));
}