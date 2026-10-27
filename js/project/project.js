import { updateState } from "../core/gameState.js";
import { getTeamPower } from "../company/employee.js";
import { addHistoryLog } from "../history/historyManager.js";

export function getAvailableProjects(projects, state) {
  return projects.filter((project) => (project.minReputation ?? 0) <= state.reputation);
}

export function canAcceptProject(project, state) {
  return (project.minReputation ?? 0) <= state.reputation
    && state.technology >= project.requiredTechnology
    && state.employees.length >= project.requiredEmployees
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
        large: project.large
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