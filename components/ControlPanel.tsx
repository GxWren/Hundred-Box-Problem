"use client";

import React from "react";
import { SimulationState } from "@/lib/simulationEngine";
import { Action } from "@/lib/useSimulationReducer";
import { validateBoxes } from "@/lib/simulationEngine";

interface ControlPanelProps {
  state: SimulationState;
  dispatch: React.Dispatch<Action>;
}

export default function ControlPanel({ state, dispatch }: ControlPanelProps) {
  const { phase, N, populateMode, selectMode, seed, speed, boxes, maxOpens, currentTurn } = state;
  const isSetup = phase === "setup";
  const isRunning = phase === "running";
  const isPaused = phase === "paused";
  const isComplete = phase === "complete";

  const validation = validateBoxes(boxes, N);

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* ── Setup Phase ────────────────────────────────────────────── */}
      {isSetup && (
        <section className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-white text-base">Setup</h2>

          {/* N */}
          <label className="flex flex-col gap-1 text-gray-300">
            Number of prisoners (N)
            <input
              type="number"
              min={2}
              max={200}
              value={N}
              onChange={(e) => dispatch({ type: "SET_N", payload: Number(e.target.value) })}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white w-24"
            />
          </label>

          {/* Populate mode */}
          <div className="flex flex-col gap-1 text-gray-300">
            <span>Populate boxes</span>
            <div className="flex gap-3">
              {(["random", "manual"] as const).map((m) => (
                <label key={m} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="populateMode"
                    value={m}
                    checked={populateMode === m}
                    onChange={() => dispatch({ type: "SET_POPULATE_MODE", payload: m })}
                  />
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Seed (random mode) */}
          {populateMode === "random" && (
            <label className="flex flex-col gap-1 text-gray-300">
              RNG Seed (optional)
              <input
                type="text"
                value={seed}
                onChange={(e) => dispatch({ type: "SET_SEED", payload: e.target.value })}
                placeholder="leave blank for random"
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white w-48"
              />
            </label>
          )}

          {/* Random population button */}
          {populateMode === "random" && (
            <button
              onClick={() => dispatch({ type: "RANDOMIZE_BOXES" })}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded"
            >
              Randomize boxes
            </button>
          )}

          {/* Manual mode helpers */}
          {populateMode === "manual" && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => dispatch({ type: "AUTOFILL_REMAINING" })}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded"
              >
                Auto-fill remaining
              </button>
              <button
                onClick={() => dispatch({ type: "CLEAR_BOXES" })}
                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded"
              >
                Clear
              </button>
            </div>
          )}

          {/* Validation errors */}
          {!validation.valid && validation.errors.length > 0 && (
            <ul className="text-red-400 text-xs list-disc list-inside">
              {validation.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}

          {/* Select mode */}
          <div className="flex flex-col gap-1 text-gray-300">
            <span>Prisoner selection</span>
            <div className="flex gap-3">
              {(["optimal", "manual"] as const).map((m) => (
                <label key={m} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="selectMode"
                    value={m}
                    checked={selectMode === m}
                    onChange={() => dispatch({ type: "SET_SELECT_MODE", payload: m })}
                  />
                  {m === "optimal" ? "Optimal (auto)" : "Manual"}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={() => dispatch({ type: "START_SIMULATION" })}
            disabled={!validation.valid}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded font-semibold"
          >
            Start Simulation
          </button>
        </section>
      )}

      {/* ── Simulation Phase ───────────────────────────────────────── */}
      {(isRunning || isPaused || isComplete) && (
        <section className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-white text-base">Simulation</h2>

          {/* Progress */}
          <div className="text-gray-300 text-xs flex flex-col gap-1">
            <div>
              Prisoners done:{" "}
              <span className="text-white font-semibold">
                {Object.keys(state.completedPrisoners).length} / {N}
              </span>
            </div>
            {currentTurn && (
              <>
                <div>
                  Current prisoner:{" "}
                  <span className="text-yellow-300 font-semibold">#{currentTurn.prisonerId}</span>
                </div>
                <div>
                  Opens used:{" "}
                  <span className="text-white font-semibold">
                    {currentTurn.openedCount} / {maxOpens}
                  </span>
                </div>
              </>
            )}
            {isComplete && (
              <div className={state.failedAt ? "text-red-400 font-semibold" : "text-green-400 font-semibold"}>
                {state.failedAt
                  ? `FAILED – Prisoner ${state.failedAt} could not find their number`
                  : "SUCCESS – All prisoners found their number! 🎉"}
              </div>
            )}
          </div>

          {/* Optimal mode controls */}
          {selectMode === "optimal" && !isComplete && (
            <>
              <div className="flex gap-2 flex-wrap">
                {isRunning ? (
                  <button
                    onClick={() => dispatch({ type: "PAUSE" })}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={() => dispatch({ type: "PLAY" })}
                    className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded"
                  >
                    Play
                  </button>
                )}
                <button
                  onClick={() => dispatch({ type: "STEP" })}
                  disabled={isRunning}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1.5 rounded"
                >
                  Step
                </button>
              </div>

              <label className="flex flex-col gap-1 text-gray-300 text-xs">
                Speed
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={speed}
                  onChange={(e) => dispatch({ type: "SET_SPEED", payload: Number(e.target.value) })}
                  className="w-full"
                />
                <span>{speed} ms / step</span>
              </label>
            </>
          )}

          {/* Manual mode controls */}
          {selectMode === "manual" && !isComplete && currentTurn && (
            <div className="flex flex-col gap-2">
              <p className="text-gray-300 text-xs">
                Prisoner <span className="text-yellow-300 font-bold">#{currentTurn.prisonerId}</span> –
                click boxes to open them ({maxOpens - currentTurn.openedCount} opens remaining)
              </p>
              <button
                onClick={() => dispatch({ type: "NEXT_PRISONER_MANUAL" })}
                disabled={!currentTurn.found && currentTurn.openedCount < maxOpens}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1.5 rounded"
              >
                Next Prisoner
              </button>
            </div>
          )}

          {/* Reset / Restart */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => dispatch({ type: "RESTART" })}
              disabled={isComplete ? false : isRunning}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white px-3 py-1.5 rounded"
            >
              Restart
            </button>
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded"
            >
              Reset
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
