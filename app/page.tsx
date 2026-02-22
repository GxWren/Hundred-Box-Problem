"use client";

import React, { useState } from "react";
import { useSimulationReducer } from "@/lib/useSimulationReducer";
import { useInterval } from "@/lib/useInterval";
import BoxGrid from "@/components/BoxGrid";
import ControlPanel from "@/components/ControlPanel";
import LogPanel from "@/components/LogPanel";
import ManualBoxAssign from "@/components/ManualBoxAssign";

export default function Home() {
  const { state, dispatch } = useSimulationReducer();
  const [selectedSetupBoxId, setSelectedSetupBoxId] = useState<number | null>(null);

  const isSetup = state.phase === "setup";
  const isRunning = state.phase === "running";
  const isManualSelection = state.selectMode === "manual";
  const isManualPopulate = state.populateMode === "manual";

  // Auto-play for optimal mode
  useInterval(
    () => {
      if (state.phase !== "running" || state.selectMode !== "optimal") return;
      if (!state.currentTurn) return;
      dispatch({ type: "STEP" });
    },
    isRunning && state.selectMode === "optimal" ? state.speed : null
  );

  const handleSetupBoxClick = (boxId: number) => {
    setSelectedSetupBoxId((prev) => (prev === boxId ? null : boxId));
  };

  const handleValueAssign = (boxId: number, value: number) => {
    dispatch({ type: "SET_BOX_VALUE", boxId, value });
    setSelectedSetupBoxId(null);
  };

  const handleSimBoxClick = (boxId: number) => {
    if (isManualSelection && (state.phase === "running" || state.phase === "paused")) {
      dispatch({ type: "OPEN_BOX_MANUAL", boxId });
    }
  };

  const currentOpenedBoxIds = state.currentTurn?.openedBoxIds ?? [];
  const currentPrisonerId = state.currentTurn?.prisonerId ?? null;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">100 Prisoners &amp; Boxes</h1>
        <p className="text-gray-400 text-sm mt-1">Animated simulator of the classic probability problem</p>
      </header>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
        {/* Left column: Controls + Log */}
        <aside className="lg:w-72 flex-shrink-0 flex flex-col gap-4">
          <ControlPanel state={state} dispatch={dispatch} />

          {/* Manual box-value assignment */}
          {isSetup && isManualPopulate && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Assign values</h3>
              <ManualBoxAssign
                boxes={state.boxes}
                N={state.N}
                selectedBoxId={selectedSetupBoxId}
                onSetValue={handleValueAssign}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Event Log</h3>
            <LogPanel log={state.log} />
          </div>
        </aside>

        {/* Right column: Box grid */}
        <section className="flex-1 min-w-0">
          <div className="bg-gray-900 rounded-lg p-3">
            <BoxGrid
              boxes={state.boxes}
              currentOpenedBoxIds={currentOpenedBoxIds}
              currentPrisonerId={currentPrisonerId}
              selectedBoxId={selectedSetupBoxId}
              isSetupMode={isSetup && isManualPopulate}
              onSetupBoxClick={handleSetupBoxClick}
              clickable={!isSetup && isManualSelection}
              onBoxClick={handleSimBoxClick}
            />
          </div>

          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-700 border border-gray-300 inline-block" />
              Closed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-900 border border-yellow-400 inline-block" />
              Current prisoner
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-800 border border-green-400 inline-block" />
              Open
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
