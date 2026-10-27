import { updateState } from "../core/gameState.js";
import { getEmployeeSales, getOperationalEmployees, getTeamPower } from "../company/employee.js";
import { addHistoryLog } from "../history/historyManager.js";

export function getAvailableProjects(projects, state) {
  return projects.filter((project) => (project.minReputation ?? 0) <= state.reputation);
}

export function generateProjectOffers(projects, state, offerCount = 3) {
  const offeredProjectIds = state.offeredProjectIds ?? [];
  const candidates = projects.filter((project) =>
    !offeredProjectIds.includes(project.id)
    && (project.minReputation ?? 0) <= state.reputation
  );
  const salesPower = state.employees
    .filter((employee) => (state.salesEmployeeIds ?? []).includes(employee.id))
    .reduce((total, employee) => total + getEmployeeSales(employee), 0);
  const maxTier = salesPower >= 35 ? 3 : salesPower >= 15 ? 2 : 1;
  const eligible = candidates.filter((project) => getProjectTier(project) <= maxTier);
  const offers = [];
  while (offers.length < offerCount && eligible.length > 0) {
    const weights = eligible.map((project) => Math.max(1, maxTier - getProjectTier(project) + 1));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let target = Math.random() * totalWeight;
    const selectedIndex = weights.findIndex((weight) => {
      target -= weight;
      return target < 0;
    });
    offers.push(eligible.splice(selectedIndex < 0 ? eligible.length - 1 : selectedIndex, 1)[0]);
  }
  return offers;
}

function getProjectTier(project) {
  if (project.large || project.requiredEmployees > 5) return 3;
  if (project.requiredEmployees > 2) return 2;
  return 1;
}

export function canAcceptProject(project, state) {
  const assignedEmployees = state.activeProjects.reduce(
    (total, active) => total + (active.requiredEmployees ?? 1),
    0
  );
  const operationalEmployeeCount = getOperationalEmployees(state).length;
  return (project.minReputation ?? 0) <= state.reputation
    && state.technology >= project.requiredTechnology
    && operationalEmployeeCount >= project.requiredEmployees
    && assignedEmployees + project.requiredEmployees <= operationalEmployeeCount
    && !state.activeProjects.some((active) => active.projectId === project.id);
}

export function acceptProject(project) {
  let accepted = false;
  updateState((state) => {
    if (!canAcceptProject(project, state)) return state;
    accepted = true;
    addHistoryLog(
      state,
      "project",
      "案件受注",
      `「${project.name}」を受注した`
    );
    return {
      ...state,
      activeProjects: [...state.activeProjects, {
        projectId: project.id,
        name: project.name,
        monthsRemaining: project.duration,
        totalMonths: project.duration,
        reward: project.reward,
        large: project.large,
        requiredEmployees: project.requiredEmployees
      }]
    };
  });
  return accepted;
}

export function advanceProjects(projects) {
  const completed = [];
  updateState((state) => {
    const activeProjects = state.activeProjects.flatMap((active) => {
      const remaining = active.monthsRemaining - 1;
      if (remaining > 0) return [{ ...active, monthsRemaining: remaining }];
      const project = projects.find((item) => item.id === active.projectId);
      if (project) completed.push({ ...project, success: isProjectSuccessful(project, state) });
      return [];
    });
    return { ...state, activeProjects };
  });
  return completed;
}

export function completeProjects(completed) {
  updateState((state) => {
    let funds = state.funds;
    let reputation = state.reputation;
    let technology = state.technology;
    let completedProjects = state.completedProjects;
    let largeProjectsCompleted = state.largeProjectsCompleted;
    completed.forEach((project) => {
      if (project.success) {

        addHistoryLog(
          state,
          "project",
          "案件完了",
          `「${project.name}」が成功した`
        );

        funds += project.reward;
        reputation += project.successReputation ?? project.reputationSuccess ?? 0;
        technology += project.technologyGain ?? Math.max(1, project.difficulty ?? 1);
        completedProjects += 1;

        if (project.large) {
          largeProjectsCompleted += 1;
        }
      }else {
        addHistoryLog(
          state,
          "project",
          "案件失敗",
          `「${project.name}」が失敗した`
        );
        reputation -= Math.abs(project.failureReputation ?? project.reputationFailure ?? 0);
      }
    });
    return {
      ...state,
      funds,
      reputation: Math.min(100, Math.max(0, reputation)),
      technology,
      completedProjects,
      largeProjectsCompleted
    };
  });
}

function isProjectSuccessful(project, state) {
  const projectPower = getTeamPower(state);
  const performance = state.technology + projectPower;
  return performance >= project.requiredTechnology + project.requiredEmployees * 4;
}

export function getProgress(active) {
  return Math.round(((active.totalMonths - active.monthsRemaining) / active.totalMonths) * 100);
}