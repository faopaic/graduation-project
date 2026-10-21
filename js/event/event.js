import { updateState } from "../core/gameState.js";

export function shouldTriggerEvent(state) {
  return !state.lastEventId && Math.random() < 0.45;
}

export function chooseEvent(events, state) {
  const options = events.filter((event) => event.id !== state.lastEventId);
  return options[Math.floor(Math.random() * options.length)] ?? null;
}

export function applyEventChoice(choice) {
  updateState((state) => {
    const effects = choice.effects ?? {};
    return {
      ...state,
      funds: Math.max(0, state.funds + (effects.funds ?? 0)),
      reputation: Math.min(100, Math.max(0, state.reputation + (effects.reputation ?? 0))),
      technology: Math.max(0, state.technology + (effects.technology ?? 0)),
      morale: Math.min(100, Math.max(0, state.morale + (effects.morale ?? 0))),
      lastEventId: null
    };
  });
}

export function markEventShown(eventId) {
  updateState((state) => ({ ...state, lastEventId: eventId }));
}