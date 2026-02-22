/**
 * useSimulationReducer.ts
 *
 * Reducer-based state machine for the 100-Prisoners simulator.
 */

import { useReducer } from "react";
import {
  SimulationState,
  Box,
  createInitialState,
  createBoxes,
  shufflePermutation,
  applyPermutationToBoxes,
  validateBoxes,
  openBox,
  stepOptimal,
  advanceIfTurnComplete,
  buildFirstTurn,
  resetBoxes,
} from "./simulationEngine";

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

export type Action =
  | { type: "SET_N"; payload: number }
  | { type: "SET_POPULATE_MODE"; payload: "random" | "manual" }
  | { type: "SET_SELECT_MODE"; payload: "optimal" | "manual" }
  | { type: "SET_SEED"; payload: string }
  | { type: "SET_SPEED"; payload: number }
  | { type: "RANDOMIZE_BOXES" }
  | { type: "SET_BOX_VALUE"; boxId: number; value: number }
  | { type: "CLEAR_BOXES" }
  | { type: "AUTOFILL_REMAINING" }
  | { type: "START_SIMULATION" }
  | { type: "STEP" }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "RESET" }
  | { type: "RESTART" }
  | { type: "OPEN_BOX_MANUAL"; boxId: number }
  | { type: "NEXT_PRISONER_MANUAL" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: SimulationState, action: Action): SimulationState {
  switch (action.type) {
    case "SET_N": {
      const N = Math.max(2, Math.min(200, action.payload));
      return createInitialState({ N, seed: state.seed });
    }

    case "SET_POPULATE_MODE":
      return { ...state, populateMode: action.payload };

    case "SET_SELECT_MODE":
      return { ...state, selectMode: action.payload };

    case "SET_SEED":
      return { ...state, seed: action.payload };

    case "SET_SPEED":
      return { ...state, speed: action.payload };

    case "RANDOMIZE_BOXES": {
      const perm = shufflePermutation(state.N, state.seed || undefined);
      return {
        ...state,
        boxes: applyPermutationToBoxes(state.boxes, perm),
      };
    }

    case "SET_BOX_VALUE": {
      const { boxId, value } = action;
      const newBoxes = state.boxes.map((b) =>
        b.id === boxId ? { ...b, value } : b
      );
      return { ...state, boxes: newBoxes };
    }

    case "CLEAR_BOXES":
      return { ...state, boxes: createBoxes(state.N) };

    case "AUTOFILL_REMAINING": {
      const { remainingNumbers } = validateBoxes(state.boxes, state.N);
      const unassigned = state.boxes.filter((b) => b.value === null);
      if (remainingNumbers.length === 0 || unassigned.length === 0) return state;

      const shuffled = shufflePermutation(remainingNumbers.length, state.seed || undefined)
        .map((i) => remainingNumbers[i - 1]);

      let idx = 0;
      const newBoxes = state.boxes.map((b) => {
        if (b.value === null && idx < shuffled.length) {
          return { ...b, value: shuffled[idx++] };
        }
        return b;
      });
      return { ...state, boxes: newBoxes };
    }

    case "START_SIMULATION": {
      const { valid } = validateBoxes(state.boxes, state.N);
      if (!valid) return state;
      return {
        ...state,
        phase: "running",
        currentTurn: buildFirstTurn(),
        completedPrisoners: {},
        failedAt: null,
        log: ["Simulation started"],
      };
    }

    case "STEP": {
      if (state.phase !== "running" && state.phase !== "paused") return state;
      if (!state.currentTurn) return state;
      if (state.selectMode !== "optimal") return state;

      let next = stepOptimal(state);
      next = advanceIfTurnComplete(next);
      return next;
    }

    case "PLAY":
      if (state.phase === "paused" || state.phase === "running") {
        return { ...state, phase: "running" };
      }
      return state;

    case "PAUSE":
      if (state.phase === "running") {
        return { ...state, phase: "paused" };
      }
      return state;

    case "RESET":
      return createInitialState({ N: state.N, seed: state.seed });

    case "RESTART": {
      return {
        ...state,
        phase: "running",
        boxes: resetBoxes(state.boxes),
        currentTurn: buildFirstTurn(),
        completedPrisoners: {},
        failedAt: null,
        log: ["Simulation restarted"],
      };
    }

    case "OPEN_BOX_MANUAL": {
      if (state.phase !== "running" && state.phase !== "paused") return state;
      if (!state.currentTurn) return state;
      if (state.selectMode !== "manual") return state;
      if (state.currentTurn.openedCount >= state.maxOpens) return state;
      if (state.currentTurn.found) return state;

      let next = openBox(state, action.boxId);
      next = advanceIfTurnComplete(next);
      return next;
    }

    case "NEXT_PRISONER_MANUAL": {
      if (state.selectMode !== "manual") return state;
      if (!state.currentTurn) return state;
      const { currentTurn, maxOpens } = state;
      const canAdvance = currentTurn.found || currentTurn.openedCount >= maxOpens;
      if (!canAdvance) return state;
      return advanceIfTurnComplete(state);
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSimulationReducer() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState()
  );
  return { state, dispatch };
}
