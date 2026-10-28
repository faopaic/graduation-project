import { updateState } from "../core/gameState.js";
import { getCompanyRank } from "../company/company.js";
import { getEmployeeSales, getOperationalEmployees, getTeamPower } from "../company/employee.js";
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

export function generateProjectOffers(projects, state) {
  const offeredProjectIds = state.offeredProjectIds ?? [];
  const acceptedProjectIds = new Set([
    ...(state.acceptedProjectIds ?? []),
    ...(state.activeProjects ?? []).map((project) => project.projectId)
  ]);
  const projectReofferAt = state.projectReofferAt ?? {};
  const monthIndex = getMonthIndex(state);
  const rankTier = getCompanyProjectTier(state);
  const candidates = projects.filter((project) =>
    (!offeredProjectIds.includes(project.id)
      || projectReofferAt[project.id] <= monthIndex)
    && !acceptedProjectIds.has(project.id)
    && (project.minReputation ?? 0) <= state.reputation
    && getProjectTier(project) <= rankTier
  );
  const offers = [];
  const salesEmployeeIds = state.salesEmployeeIds ?? [];
  state.employees
    .filter((employee) => salesEmployeeIds.includes(employee.id))
    .forEach((employee) => {
      const sales = getEmployeeSales(employee);
      const offerCount = sales >= 10 ? 3 : sales >= 5 ? 2 : 1;
      const maxTier = Math.min(rankTier, sales >= 50 ? 3 : sales >= 30 ? 2 : 1);
      for (let index = 0; index < offerCount; index += 1) {
        const available = candidates.filter((project) =>
          !offers.some((offer) => offer.id === project.id)
          && getProjectTier(project) <= maxTier
        );
        if (available.length === 0) break;
        const offer = chooseRandomProject(available, maxTier);
        offers.push(offer);
      }
    });
  return offers;
}

export function expireProjectOffers(state, reofferDelay = 3) {
  const monthIndex = getMonthIndex(state);
  const deadlines = state.projectDeadlines ?? {};
  const reofferAt = { ...(state.projectReofferAt ?? {}) };
  (state.offeredProjectIds ?? []).forEach((projectId) => {
    if (deadlines[projectId] < monthIndex && reofferAt[projectId] === undefined) {
      reofferAt[projectId] = monthIndex + reofferDelay;
    }
  });
  return reofferAt;
}

function getCompanyProjectTier(state) {
  const rank = getCompanyRank(state);
  if (rank === "大企業候補") return 3;
  if (rank === "成長企業") return 2;
  return 1;
}

function chooseRandomProject(projects, maxTier) {
  const tier = 1 + Math.floor(Math.random() * maxTier);
  const tierProjects = projects.filter((project) => getProjectTier(project) === tier);
  const pool = tierProjects.length > 0
    ? tierProjects
    : projects;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getProjectTier(project) {
  if (project.large || project.requiredEmployees > 5) return 3;
  if (project.requiredEmployees > 2) return 2;
  return 1;
}

export function canAcceptProject(project, state) {
<<<<<<< HEAD
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
=======
  const assignedEmployees = state.activeProjects.reduce(
    (total, active) => total + (active.requiredEmployees ?? 1),
    0
  );
  const operationalEmployeeCount = getOperationalEmployees(state).length;
  const deadline = state.projectDeadlines?.[project.id];
  return (project.minReputation ?? 0) <= state.reputation
    && (!deadline || getMonthIndex(state) <= deadline)
    && state.technology >= project.requiredTechnology
    && operationalEmployeeCount >= project.requiredEmployees
    && assignedEmployees + project.requiredEmployees <= operationalEmployeeCount
    && !state.activeProjects.some((active) => active.projectId === project.id);
}

export function getMonthIndex(state) {
  return state.calendarYear * 12 + state.month;
}

export function getDeadlineMonths(project) {
  if (project.large || project.requiredEmployees > 5) return 4;
  if (project.requiredEmployees > 2) return 3;
  return 2;
>>>>>>> a0084d3d0ebb1440d802509c46f10b6248740402
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
<<<<<<< HEAD
      availableProjectIds: state.availableProjectIds.filter((id) => id !== project.id),
=======
      acceptedProjectIds: [
        ...(state.acceptedProjectIds ?? []),
        project.id
      ],
>>>>>>> a0084d3d0ebb1440d802509c46f10b6248740402
      activeProjects: [...state.activeProjects, {
        projectId: project.id,
        name: project.name,
        monthsRemaining: project.duration,
        totalMonths: project.duration,
<<<<<<< HEAD
        reward: getProjectRewardAmount(project, state),
        large: isLargeProject(project)
=======
        reward: project.reward,
        large: project.large,
        requiredEmployees: project.requiredEmployees
>>>>>>> a0084d3d0ebb1440d802509c46f10b6248740402
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
    let technology = state.technology;
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

<<<<<<< HEAD
        pendingProjectRewards.push({
          projectId: project.id,
          name: project.name,
          amount: Math.round(getProjectRewardAmount(project, state) * 0.3),
          paymentsRemaining: 3
        });
        const reputationGain = project.successReputation ?? project.reputationSuccess ?? 0;
        reputation += Math.round(Math.max(0, reputationGain) * 0.5);
=======
        funds += project.reward;
        reputation += project.successReputation ?? project.reputationSuccess ?? 0;
        technology += project.technologyGain ?? Math.max(1, project.difficulty ?? 1);
>>>>>>> a0084d3d0ebb1440d802509c46f10b6248740402
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
<<<<<<< HEAD
      pendingProjectRewards,
      reputation: Math.min(100, Math.max(0, reputation)),
=======
      funds,
      reputation: Math.min(100, Math.max(0, reputation)),
      technology,
>>>>>>> a0084d3d0ebb1440d802509c46f10b6248740402
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