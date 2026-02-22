"use client";

import React from "react";
import { Box } from "@/lib/simulationEngine";

interface ManualBoxAssignProps {
  boxes: Box[];
  N: number;
  selectedBoxId: number | null;
  onSetValue: (boxId: number, value: number) => void;
}

export default function ManualBoxAssign({ boxes, N, selectedBoxId, onSetValue }: ManualBoxAssignProps) {
  const usedValues = new Set(boxes.map((b) => b.value).filter((v) => v !== null));

  const handleValueSelect = (value: number) => {
    if (selectedBoxId === null) return;
    onSetValue(selectedBoxId, value);
  };

  return (
    <div className="flex flex-col gap-2 text-xs text-gray-300">
      <p>
        Click a box in the grid to select it, then pick its value below.
        {selectedBoxId !== null ? (
          <span className="ml-1 text-yellow-300 font-semibold">
            Selected: Box {selectedBoxId}
          </span>
        ) : (
          <span className="ml-1 text-gray-500">(no box selected)</span>
        )}
      </p>
      <div
        className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 bg-gray-900 rounded border border-gray-700"
      >
        {Array.from({ length: N }, (_, i) => i + 1).map((v) => {
          const taken = usedValues.has(v);
          return (
            <button
              key={v}
              disabled={taken || selectedBoxId === null}
              onClick={() => handleValueSelect(v)}
              className={[
                "w-8 h-8 rounded text-xs font-mono border",
                taken
                  ? "bg-gray-700 border-gray-600 text-gray-600 cursor-not-allowed"
                  : selectedBoxId === null
                  ? "bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed"
                  : "bg-blue-800 border-blue-500 text-white hover:bg-blue-600 cursor-pointer",
              ].join(" ")}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { ManualBoxAssign };
