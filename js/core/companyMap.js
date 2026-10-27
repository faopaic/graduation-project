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
        completedProjects: state.completedProjects,
        activeProjects: state.activeProjects.length,
        colorLevel:Math.min(
            10,Math.max(
                1,Math.ceil(
                    state.reputation / 10
                )
            )
        ),
        symbol: "",
        event: "",
        events: []
    };
}

export function addGrowthCell(
  state,
  symbol = "",
  event = ""
) {
  const cell = {
    ...createGrowthCell(state),
    symbol,
    event
  };
  return [
    ...state.growthMap,
    cell
  ];
}

const PRIORITY = {
  Y: 1,
  E: 2,
  P: 3,
  L: 4,
  R: 5
};
export function updateLatestGrowthCell(
  state,
  symbol,
  event
) {
  if (state.growthMap.length === 0) {
    return state.growthMap;
  }
  const growthMap = [...state.growthMap];
  const lastIndex = growthMap.length - 1;
  const currentSymbol =
    growthMap[lastIndex].symbol || "";
  const currentPriority =
    PRIORITY[currentSymbol] || 0;
  const newPriority =
    PRIORITY[symbol] || 0;
  if (newPriority < currentPriority) {
    return growthMap;
  }
  growthMap[lastIndex] = {
    ...growthMap[lastIndex],
    symbol,
    event,
    events: [
        ...(growthMap[lastIndex].events || []),
        event
    ]
  };
  return growthMap;
}