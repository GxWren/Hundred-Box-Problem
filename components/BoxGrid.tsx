"use client";

import React from "react";
import { Box, gridDimensions } from "@/lib/simulationEngine";
import BoxCard from "./BoxCard";

interface BoxGridProps {
  boxes: Box[];
  currentOpenedBoxIds: number[];
  currentPrisonerId: number | null;
  onBoxClick?: (id: number) => void;
  clickable?: boolean;
  /** In manual-setup mode: which box is currently selected */
  selectedBoxId?: number | null;
  onSetupBoxClick?: (id: number) => void;
  isSetupMode?: boolean;
}

export default function BoxGrid({
  boxes,
  currentOpenedBoxIds,
  currentPrisonerId,
  onBoxClick,
  clickable,
  selectedBoxId,
  onSetupBoxClick,
  isSetupMode,
}: BoxGridProps) {
  const N = boxes.length;
  const { cols } = gridDimensions(N);

  return (
    <div
      className="w-full"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: "2px",
      }}
    >
      {boxes.map((box) => {
        const isInCurrentPath = currentOpenedBoxIds.includes(box.id);
        const isCurrentPrisoner =
          isInCurrentPath &&
          box.openedBy === currentPrisonerId;
        const isSelected = isSetupMode && selectedBoxId === box.id;

        const handleClick = () => {
          if (isSetupMode && onSetupBoxClick) {
            onSetupBoxClick(box.id);
          } else if (clickable && onBoxClick) {
            onBoxClick(box.id);
          }
        };

        return (
          <div key={box.id} className={isSelected ? "ring-2 ring-yellow-400 rounded" : ""}>
            <BoxCard
              box={box}
              isCurrentPrisoner={isCurrentPrisoner}
              isInCurrentPath={isInCurrentPath}
              onClick={handleClick}
              disabled={!clickable && !isSetupMode}
            />
          </div>
        );
      })}
    </div>
  );
}
