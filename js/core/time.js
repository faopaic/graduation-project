export const LAST_YEAR = 5;

export function formatDate(state) {
  return `${state.calendarYear}年 ${state.month}月(創業${state.year}年目)`;
}

export function advanceMonth(state) {

  let month = state.month + 1;
  let year = state.year;
  let calendarYear = state.calendarYear;

  if (month > 12) {
    month = 1;
    year += 1;
    calendarYear += 1;
  }

  let quarter = 1;

  if (month >= 4 && month <= 6) {
    quarter = 1;
  } else if (month >= 7 && month <= 9) {
    quarter = 2;
  } else if (month >= 10 && month <= 12) {
    quarter = 3;
  } else {
    quarter = 4;
  }

  return {
    ...state,
    month,
    year,
    calendarYear,
    quarter
  };

}

export function hasReachedEnd(state) {
  return state.year > LAST_YEAR || (state.year === LAST_YEAR && state.month === 12);
}