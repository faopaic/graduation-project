export function getMapPosition(state) {
    const position =((state.year - 1) * 12)+ (state.month - 4);
    return Math.max(0, position);
}
export function getGrowthMap(state) {
    const currentPosition =getMapPosition(state);
    return Array.from(
        { length: 60 },
        (_, index) => ({
        visited:
        index < currentPosition,
        current:
        index === currentPosition
        })
    );
}

export function createGrowthCell(state) {
  return {
    year: state.year,
    month: state.month,
    calendarYear: state.calendarYear,
    reputation: state.reputation,
    technology: state.technology,
    morale: state.morale,
    funds: state.funds,
    completedProjects:
      state.completedProjects,
    activeProjects:
      state.activeProjects.length,
    symbol: "",
    event: ""
  };
}

export function addGrowthCell(state) {
  const cell = createGrowthCell(state);
  return [
    ...state.growthMap,
    cell
  ];
}