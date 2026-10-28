import { updateState } from "../core/gameState.js";
import { getTeamPower } from "../company/employee.js";
import { addHistoryLog } from "../history/historyManager.js";

export function getAvailableProjects(projects, state) {
  return projects.filter((project) => canAccessProject(project, state));
}

export function getProjectRewardRate(project) {
  const difficulty = Math.min(5, Math.max(1, Number(project.difficulty) || 1));
  return 0.4 + (difficulty - 1) * 0.1;
}

export function getProjectSuccessRate(project) {
  const successRates = {
    1: 90,
    2: 75,
    3: 65,
    4: 50,
    5: 40,
    6: 35
  };
  const difficulty = Math.min(6, Math.max(1, Number(project.difficulty) || 1));
  return successRates[difficulty];
}

export function getProjectRewardAmount(project, state) {
  const rewardInManYen = project.reward >= 10000
    ? project.reward / 10000
    : project.reward;
  return Math.round(
    rewardInManYen * 10
    * getProjectRewardRate(project)
    * (state.projectRewardRate ?? 1)
  );
}

export function isLargeProject(project) {
  return Boolean(project.large) || Number(project.difficulty) >= 5;
}

export function canAccessProject(project, state) {
  return (project.minReputation ?? 0) <= state.reputation
    && (Number(project.difficulty) || 1) <= (state.equipmentLevel ?? 1);
}

export function canAcceptProject(project, state) {
  return canAccessProject(project, state)
    && state.technology >= project.requiredTechnology
    && state.employees.length >= project.requiredEmployees
    && state.availableProjectIds.includes(project.id)
    && !state.activeProjects.some((active) => active.projectId === project.id);
}

export function offerProjects(projects, count) {
  updateState((state) => {
    const activeIds = state.activeProjects.map((project) => project.projectId);
    const candidates = projects.filter((project) =>
      canAccessProject(project, state)
      && !activeIds.includes(project.id)
      && !state.availableProjectIds.includes(project.id)
    );
    const selected = selectWeightedProjects(candidates, count, state).map((project) => project.id);
    return {
      ...state,
      availableProjectIds: [...state.availableProjectIds, ...selected]
    };
  });
}

function selectWeightedProjects(candidates, count, state) {
  const equipmentLevel = Math.min(6, Math.max(1, state.equipmentLevel ?? 1));
  const sameLevelRate = {
    1: 70,
    2: 60,
    3: 50,
    4: 45,
    5: 35,
    6: 30
  }[equipmentLevel];
  const selected = [];
  const remaining = [...candidates];

  while (selected.length < count && remaining.length > 0) {
    const sameLevel = remaining.filter((project) => Number(project.difficulty) === equipmentLevel);
    const lowerLevel = remaining.filter((project) => Number(project.difficulty) < equipmentLevel);
    const chooseSameLevel = sameLevel.length > 0
      && (lowerLevel.length === 0 || Math.random() * 100 < sameLevelRate);
    const pool = chooseSameLevel ? sameLevel : lowerLevel.length > 0 ? lowerLevel : sameLevel;
    const selectedProject = pool[Math.floor(Math.random() * pool.length)];
    selected.push(selectedProject);
    remaining.splice(remaining.indexOf(selectedProject), 1);
  }
  return selected;
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
      availableProjectIds: state.availableProjectIds.filter((id) => id !== project.id),
      activeProjects: [...state.activeProjects, {
        projectId: project.id,
        name: project.name,
        monthsRemaining: project.duration,
        totalMonths: project.duration,
        reward: getProjectRewardAmount(project, state),
        large: isLargeProject(project)
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
    let reputation = state.reputation;
    let completedProjects = state.completedProjects;
    let largeProjectsCompleted = state.largeProjectsCompleted;
    const pendingProjectRewards = [...(state.pendingProjectRewards ?? [])];
    completed.forEach((project) => {
      if (project.success) {

        addHistoryLog(
          state,
          "project",
          "案件完了",
          `「${project.name}」が成功した`
        );

        pendingProjectRewards.push({
          projectId: project.id,
          name: project.name,
          amount: Math.round(getProjectRewardAmount(project, state) * 0.3),
          paymentsRemaining: 3
        });
        const reputationGain = project.successReputation ?? project.reputationSuccess ?? 0;
        reputation += Math.round(Math.max(0, reputationGain) * 0.5);
        completedProjects += 1;

        if (isLargeProject(project)) {
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
      pendingProjectRewards,
      reputation: Math.min(100, Math.max(0, reputation)),
      completedProjects,
      largeProjectsCompleted
    };
  });
}

export function processMonthlyProjectRewards() {
  let paid = 0;
  let qualityInvestmentBonus = 0;
  updateState((state) => {
    const bonusMonths = state.qualityInvestmentRewardBonusMonths ?? 0;
    const pendingProjectRewards = (state.pendingProjectRewards ?? []).flatMap((reward) => {
      if (Math.random() >= 0.5) return [reward];
      paid += reward.amount;
      return reward.paymentsRemaining > 1
        ? [{ ...reward, paymentsRemaining: reward.paymentsRemaining - 1 }]
        : [];
    });
    qualityInvestmentBonus = paid > 0 && bonusMonths > 0 ? 500 : 0;
    return {
      ...state,
      funds: state.funds + paid + qualityInvestmentBonus,
      pendingProjectRewards,
      qualityInvestmentRewardBonusMonths: Math.max(0, bonusMonths - 1)
    };
  });
  return paid + qualityInvestmentBonus;
}

function isProjectSuccessful(project, state) {
  const projectPower = getTeamPower(state);
  const performance = state.technology + projectPower;
  return performance >= project.requiredTechnology + project.requiredEmployees * 4
    && Math.random() * 100 < getProjectSuccessRate(project);
}

export function getProgress(active) {
  return Math.round(((active.totalMonths - active.monthsRemaining) / active.totalMonths) * 100);
}