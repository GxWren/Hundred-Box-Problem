/**
 * simulationEngine.ts
 *
 * Pure functions for the 100-Prisoners / 100-Boxes simulation.
 * No React dependencies – fully unit-testable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Box {
  id: number;        // 1-based
  value: number | null;
  isOpen: boolean;
  openedBy?: number; // prisoner id that opened it
}

export interface TurnState {
  prisonerId: number;
  openedCount: number;
  found: boolean;
  lastRevealed: number | null;
  openedBoxIds: number[];
}

export type Phase = "setup" | "running" | "paused" | "complete";
export type PopulateMode = "random" | "manual";
export type SelectMode = "optimal" | "manual";

export interface SimulationState {
  N: number;
  maxOpens: number;
  phase: Phase;
  populateMode: PopulateMode;
  selectMode: SelectMode;
  boxes: Box[];
  currentTurn: TurnState | null;
  completedPrisoners: Record<number, boolean>; // prisonerId -> success
  failedAt: number | null;
  log: string[];
  speed: number; // ms per step
  seed: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  remainingNumbers: number[];
}

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32)
// ---------------------------------------------------------------------------

function stringToSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function (): number {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let z = seed;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Core pure functions
// ---------------------------------------------------------------------------

/** Create N closed boxes with null values. */
export function createBoxes(N: number): Box[] {
  return Array.from({ length: N }, (_, i) => ({
    id: i + 1,
    value: null,
    isOpen: false,
  }));
}

/**
 * Generate a random permutation of 1..N.
 * If a seed string is provided the result is deterministic.
 */
export function shufflePermutation(N: number, seed?: string): number[] {
  const arr = Array.from({ length: N }, (_, i) => i + 1);
  const rand =
    seed !== undefined && seed !== ""
      ? mulberry32(stringToSeed(seed))
      : Math.random;

  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Apply a permutation array (length N) to boxes, returning new boxes. */
export function applyPermutationToBoxes(boxes: Box[], perm: number[]): Box[] {
  return boxes.map((box, idx) => ({ ...box, value: perm[idx] }));
}

/** Validate boxes: each number 1..N used exactly once, no nulls. */
export function validateBoxes(boxes: Box[], N: number): ValidationResult {
  const errors: string[] = [];
  const seen = new Set<number>();
  const unassigned: number[] = [];

  for (const box of boxes) {
    if (box.value === null) {
      unassigned.push(box.id);
    } else {
      if (box.value < 1 || box.value > N) {
        errors.push(`Box ${box.id} has out-of-range value ${box.value}`);
      } else if (seen.has(box.value)) {
        errors.push(`Duplicate value ${box.value}`);
      } else {
        seen.add(box.value);
      }
    }
  }

  if (unassigned.length > 0) {
    errors.push(`Unassigned boxes: ${unassigned.join(", ")}`);
  }

  const remainingNumbers: number[] = [];
  for (let n = 1; n <= N; n++) {
    if (!seen.has(n)) remainingNumbers.push(n);
  }

  return { valid: errors.length === 0 && unassigned.length === 0, errors, remainingNumbers };
}

/**
 * Open a box for the current turn.
 * Returns updated state (immutable).
 * Does nothing if the box is already open or turn is null.
 */
export function openBox(state: SimulationState, boxId: number): SimulationState {
  if (!state.currentTurn) return state;

  const boxIdx = state.boxes.findIndex((b) => b.id === boxId);
  if (boxIdx === -1) return state;
  const box = state.boxes[boxIdx];
  if (box.isOpen) return state;

  const { currentTurn } = state;
  const revealed = box.value!;

  const logEntry = `Prisoner ${currentTurn.prisonerId} opened box ${boxId} → saw ${revealed}`;

  const newBoxes = state.boxes.map((b, i) =>
    i === boxIdx ? { ...b, isOpen: true, openedBy: currentTurn.prisonerId } : b
  );

  const found = revealed === currentTurn.prisonerId;
  const newTurn: TurnState = {
    ...currentTurn,
    openedCount: currentTurn.openedCount + 1,
    found: currentTurn.found || found,
    lastRevealed: revealed,
    openedBoxIds: [...currentTurn.openedBoxIds, boxId],
  };

  return {
    ...state,
    boxes: newBoxes,
    currentTurn: newTurn,
    log: [...state.log, logEntry],
  };
}

/**
 * Perform one optimal-strategy step for the current prisoner.
 * Optimal: prisoner p opens box p first, then follows the chain.
 */
export function stepOptimal(state: SimulationState): SimulationState {
  if (!state.currentTurn) return state;
  const { currentTurn, maxOpens } = state;

  if (currentTurn.found || currentTurn.openedCount >= maxOpens) return state;

  // Determine which box to open next
  let nextBoxId: number;
  if (currentTurn.openedCount === 0) {
    // First open: prisoner p opens box p
    nextBoxId = currentTurn.prisonerId;
  } else {
    // Follow the chain: open the box whose id == last revealed number
    nextBoxId = currentTurn.lastRevealed!;
  }

  return openBox(state, nextBoxId);
}

/**
 * If the current turn is complete (found or exhausted maxOpens),
 * advance to the next prisoner. Marks failure/completion as needed.
 */
export function advanceIfTurnComplete(state: SimulationState): SimulationState {
  if (!state.currentTurn) return state;
  const { currentTurn, maxOpens, N } = state;

  const turnDone = currentTurn.found || currentTurn.openedCount >= maxOpens;
  if (!turnDone) return state;

  const successEntry = currentTurn.found
    ? `Prisoner ${currentTurn.prisonerId} FOUND ${currentTurn.prisonerId} in ${currentTurn.openedCount} opens`
    : `Prisoner ${currentTurn.prisonerId} FAILED after ${currentTurn.openedCount} opens`;

  const newCompleted = {
    ...state.completedPrisoners,
    [currentTurn.prisonerId]: currentTurn.found,
  };

  if (!currentTurn.found) {
    // Simulation failed
    return {
      ...state,
      completedPrisoners: newCompleted,
      failedAt: currentTurn.prisonerId,
      currentTurn: null,
      phase: "complete",
      log: [...state.log, successEntry, "SIMULATION FAILED – Not all prisoners found their number"],
    };
  }

  const nextPrisonerId = currentTurn.prisonerId + 1;
  if (nextPrisonerId > N) {
    // All prisoners found – success!
    return {
      ...state,
      completedPrisoners: newCompleted,
      currentTurn: null,
      phase: "complete",
      log: [...state.log, successEntry, "ALL PRISONERS SUCCEEDED! 🎉"],
    };
  }

  // Start next prisoner
  const nextTurn: TurnState = {
    prisonerId: nextPrisonerId,
    openedCount: 0,
    found: false,
    lastRevealed: null,
    openedBoxIds: [],
  };

  return {
    ...state,
    completedPrisoners: newCompleted,
    currentTurn: nextTurn,
    log: [...state.log, successEntry],
  };
}

/** Create the initial simulation state. */
export function createInitialState(overrides?: Partial<SimulationState>): SimulationState {
  const N = overrides?.N ?? 100;
  return {
    N,
    maxOpens: Math.floor(N / 2),
    phase: "setup",
    populateMode: "random",
    selectMode: "optimal",
    boxes: createBoxes(N),
    currentTurn: null,
    completedPrisoners: {},
    failedAt: null,
    log: [],
    speed: 300,
    seed: "",
    ...overrides,
  };
}

/** Build the first turn state for prisoner 1. */
export function buildFirstTurn(): TurnState {
  return { prisonerId: 1, openedCount: 0, found: false, lastRevealed: null, openedBoxIds: [] };
}

/** Re-close all boxes (keeping their assigned values). */
export function resetBoxes(boxes: Box[]): Box[] {
  return boxes.map((b) => ({ ...b, isOpen: false, openedBy: undefined }));
}

/** Compute a near-square grid dimension. Returns { cols, rows }. */
export function gridDimensions(N: number): { cols: number; rows: number } {
  const cols = Math.ceil(Math.sqrt(N));
  const rows = Math.ceil(N / cols);
  return { cols, rows };
}
