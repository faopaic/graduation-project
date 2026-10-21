export const LAST_YEAR = 5;

export function formatDate(state) {
  return `${state.year}年目 ${state.month}月`;
}

export function advanceMonth(state) {
  const nextYear = state.month === 12 ? state.year + 1 : state.year;
  const nextMonth = state.month === 12 ? 1 : state.month + 1;
  return { ...state, year: nextYear, month: nextMonth };
}

export function hasReachedEnd(state) {
  return state.year > LAST_YEAR || (state.year === LAST_YEAR && state.month === 12);
}