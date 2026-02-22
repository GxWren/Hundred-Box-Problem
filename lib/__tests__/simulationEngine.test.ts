import { describe, it, expect } from "vitest";
import {
  createBoxes,
  shufflePermutation,
  applyPermutationToBoxes,
  validateBoxes,
  openBox,
  stepOptimal,
  advanceIfTurnComplete,
  createInitialState,
  buildFirstTurn,
  Box,
  SimulationState,
} from "../simulationEngine";

// ---------------------------------------------------------------------------
// createBoxes
// ---------------------------------------------------------------------------
describe("createBoxes", () => {
  it("creates N boxes with null values", () => {
    const boxes = createBoxes(5);
    expect(boxes).toHaveLength(5);
    expect(boxes[0]).toMatchObject({ id: 1, value: null, isOpen: false });
    expect(boxes[4]).toMatchObject({ id: 5, value: null, isOpen: false });
  });
});

// ---------------------------------------------------------------------------
// shufflePermutation
// ---------------------------------------------------------------------------
describe("shufflePermutation", () => {
  it("returns a valid permutation of 1..N", () => {
    const perm = shufflePermutation(10);
    expect(perm).toHaveLength(10);
    const sorted = [...perm].sort((a, b) => a - b);
    expect(sorted).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("is deterministic when a seed is provided", () => {
    const p1 = shufflePermutation(100, "test-seed");
    const p2 = shufflePermutation(100, "test-seed");
    expect(p1).toEqual(p2);
  });

  it("produces different results for different seeds", () => {
    const p1 = shufflePermutation(100, "seed-a");
    const p2 = shufflePermutation(100, "seed-b");
    expect(p1).not.toEqual(p2);
  });
});

// ---------------------------------------------------------------------------
// validateBoxes
// ---------------------------------------------------------------------------
describe("validateBoxes", () => {
  it("passes a valid permutation", () => {
    const boxes = applyPermutationToBoxes(createBoxes(5), [3, 1, 5, 2, 4]);
    const result = validateBoxes(boxes, 5);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("catches unassigned boxes", () => {
    const boxes = createBoxes(4); // all null
    const result = validateBoxes(boxes, 4);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unassigned"))).toBe(true);
  });

  it("catches duplicates", () => {
    const boxes: Box[] = [
      { id: 1, value: 1, isOpen: false },
      { id: 2, value: 1, isOpen: false }, // duplicate!
      { id: 3, value: 3, isOpen: false },
    ];
    const result = validateBoxes(boxes, 3);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });

  it("reports remaining numbers", () => {
    const boxes: Box[] = [
      { id: 1, value: 2, isOpen: false },
      { id: 2, value: null, isOpen: false },
    ];
    const result = validateBoxes(boxes, 2);
    expect(result.remainingNumbers).toContain(1);
  });
});

// ---------------------------------------------------------------------------
// openBox
// ---------------------------------------------------------------------------
describe("openBox", () => {
  function makeState(permutation: number[]): SimulationState {
    const N = permutation.length;
    const boxes = applyPermutationToBoxes(createBoxes(N), permutation);
    return {
      ...createInitialState({ N }),
      boxes,
      currentTurn: buildFirstTurn(),
    };
  }

  it("marks a box as open and logs the event", () => {
    const state = makeState([3, 1, 2]);
    const next = openBox(state, 1);
    expect(next.boxes[0].isOpen).toBe(true);
    expect(next.boxes[0].openedBy).toBe(1);
    expect(next.log.some((l) => l.includes("opened box 1"))).toBe(true);
  });

  it("does nothing when box is already open", () => {
    const state = makeState([3, 1, 2]);
    const s1 = openBox(state, 1);
    const s2 = openBox(s1, 1); // same box again
    expect(s2.boxes[0].isOpen).toBe(true);
    expect(s2.currentTurn?.openedCount).toBe(1); // still 1
  });

  it("does not mutate original state", () => {
    const state = makeState([3, 1, 2]);
    const frozen = Object.freeze({ ...state, boxes: state.boxes.map((b) => Object.freeze({ ...b })) });
    // Should not throw
    expect(() => openBox(frozen as SimulationState, 1)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// stepOptimal (optimal chain strategy)
// ---------------------------------------------------------------------------
describe("stepOptimal", () => {
  // Arrange a simple permutation: [2, 3, 1] means box1→2, box2→3, box3→1
  // Prisoner 1 should follow: box1(→2) → box2(→3) → box3(→1): found!
  function makeRunningState(permutation: number[], prisonerId = 1): SimulationState {
    const N = permutation.length;
    const boxes = applyPermutationToBoxes(createBoxes(N), permutation);
    return {
      ...createInitialState({ N }),
      phase: "running",
      boxes,
      currentTurn: {
        prisonerId,
        openedCount: 0,
        found: false,
        lastRevealed: null,
        openedBoxIds: [],
      },
    };
  }

  it("opens the prisoner's own box first", () => {
    const state = makeRunningState([2, 3, 1], 1);
    const next = stepOptimal(state);
    expect(next.boxes[0].isOpen).toBe(true); // box 1 opened
    expect(next.currentTurn?.lastRevealed).toBe(2);
  });

  it("follows the chain correctly", () => {
    // N=6, maxOpens=3; permutation: prisoner 1 → box1(→2) → box2(→3) → box3(→1)
    const N = 6;
    const perm = [2, 3, 1, 4, 5, 6]; // cycle 1-2-3 for prisoner 1
    let state = makeRunningState(perm, 1);
    // Override N/maxOpens via a state with higher maxOpens
    state = { ...state, N, maxOpens: Math.floor(N / 2) };
    state = stepOptimal(state); // opens box 1 → sees 2
    state = stepOptimal(state); // opens box 2 → sees 3
    state = stepOptimal(state); // opens box 3 → sees 1 (FOUND)
    expect(state.currentTurn?.found).toBe(true);
  });

  it("does not open more than maxOpens boxes", () => {
    // Permutation where prisoner 1 is in a cycle longer than maxOpens
    // N=4, maxOpens=2, cycle 1→2→3→4→1
    const state = makeRunningState([2, 3, 4, 1], 1);
    let s = state;
    for (let i = 0; i < 5; i++) {
      s = stepOptimal(s);
    }
    expect(s.currentTurn?.openedCount).toBeLessThanOrEqual(state.maxOpens);
  });
});

// ---------------------------------------------------------------------------
// advanceIfTurnComplete
// ---------------------------------------------------------------------------
describe("advanceIfTurnComplete", () => {
  function makeStateWithFoundTurn(N = 3): SimulationState {
    const perm = [2, 3, 1];
    const boxes = applyPermutationToBoxes(createBoxes(N), perm);
    return {
      ...createInitialState({ N }),
      phase: "running",
      boxes,
      currentTurn: {
        prisonerId: 1,
        openedCount: 3,
        found: true,
        lastRevealed: 1,
        openedBoxIds: [1, 2, 3],
      },
    };
  }

  it("advances to prisoner 2 after prisoner 1 succeeds", () => {
    const state = makeStateWithFoundTurn();
    const next = advanceIfTurnComplete(state);
    expect(next.currentTurn?.prisonerId).toBe(2);
    expect(next.completedPrisoners[1]).toBe(true);
  });

  it("marks complete when all prisoners succeed", () => {
    const N = 1;
    const boxes = applyPermutationToBoxes(createBoxes(N), [1]);
    const state: SimulationState = {
      ...createInitialState({ N }),
      phase: "running",
      boxes,
      currentTurn: {
        prisonerId: 1,
        openedCount: 1,
        found: true,
        lastRevealed: 1,
        openedBoxIds: [1],
      },
    };
    const next = advanceIfTurnComplete(state);
    expect(next.phase).toBe("complete");
    expect(next.failedAt).toBeNull();
    expect(next.log.some((l) => l.includes("SUCCEEDED"))).toBe(true);
  });

  it("ends simulation on failure", () => {
    const N = 3;
    const boxes = applyPermutationToBoxes(createBoxes(N), [2, 3, 1]);
    const state: SimulationState = {
      ...createInitialState({ N }),
      phase: "running",
      boxes,
      currentTurn: {
        prisonerId: 2,
        openedCount: 1,
        found: false,
        lastRevealed: 3,
        openedBoxIds: [2],
      },
    };
    const next = advanceIfTurnComplete(state);
    expect(next.phase).toBe("complete");
    expect(next.failedAt).toBe(2);
    expect(next.log.some((l) => l.includes("FAILED"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Full simulation run (integration)
// ---------------------------------------------------------------------------
describe("full simulation", () => {
  it("succeeds when all prisoners find their number with optimal strategy", () => {
    // Ensure the simulation can complete successfully when the permutation is
    // the identity (each box i contains value i – every chain length is 1).
    const N = 5;
    const identityPerm = [1, 2, 3, 4, 5];
    const boxes = applyPermutationToBoxes(createBoxes(N), identityPerm);
    let state: SimulationState = {
      ...createInitialState({ N }),
      phase: "running",
      boxes,
      currentTurn: buildFirstTurn(),
    };

    // Run to completion
    let iterations = 0;
    while (state.phase === "running" && iterations < 1000) {
      state = stepOptimal(state);
      state = advanceIfTurnComplete(state);
      iterations++;
    }

    expect(state.phase).toBe("complete");
    expect(state.failedAt).toBeNull();
  });

  it("fails on first prisoner who cannot find their number", () => {
    // N=2, maxOpens=1, permutation [2,1] means:
    // Prisoner 1 opens box 1 (→2), fails (didn't find 1).
    const N = 2;
    const boxes = applyPermutationToBoxes(createBoxes(N), [2, 1]);
    let state: SimulationState = {
      ...createInitialState({ N }),
      phase: "running",
      boxes,
      currentTurn: buildFirstTurn(),
    };

    let iterations = 0;
    while (state.phase === "running" && iterations < 100) {
      state = stepOptimal(state);
      state = advanceIfTurnComplete(state);
      iterations++;
    }

    expect(state.phase).toBe("complete");
    expect(state.failedAt).toBe(1);
  });
});
