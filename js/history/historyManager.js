export function addHistoryLog(state, type, title, description) {

    if (!state.history) {
        state.history = [];
    }

    state.history.unshift({
        year: state.year,
        month: state.month,
        type,
        title,
        description,
        createdAt: Date.now()
    });

}