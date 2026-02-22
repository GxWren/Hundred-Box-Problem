"use client";

import React from "react";
import { Box } from "@/lib/simulationEngine";

interface BoxCardProps {
  box: Box;
  isCurrentPrisoner: boolean;
  isInCurrentPath: boolean;
  onClick?: (id: number) => void;
  disabled?: boolean;
}

export default function BoxCard({
  box,
  isCurrentPrisoner,
  isInCurrentPath,
  onClick,
  disabled,
}: BoxCardProps) {
  const handleClick = () => {
    if (!disabled && onClick) onClick(box.id);
  };

  let borderClass = "border-gray-300";
  if (isCurrentPrisoner && box.isOpen) borderClass = "border-yellow-400";
  else if (isInCurrentPath && box.isOpen) borderClass = "border-blue-400";
  else if (box.isOpen) borderClass = "border-green-400";

  let bgClass = "bg-gray-700";
  if (box.isOpen) {
    if (isCurrentPrisoner) bgClass = "bg-yellow-900";
    else bgClass = "bg-gray-800";
  }

  return (
    <button
      className={[
        "relative w-full aspect-square rounded border-2 text-xs font-mono",
        "transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
        borderClass,
        bgClass,
        disabled ? "cursor-default opacity-70" : "cursor-pointer hover:brightness-110",
      ].join(" ")}
      onClick={handleClick}
      disabled={disabled}
      aria-label={
        box.isOpen
          ? `Box ${box.id} open, contains ${box.value}`
          : `Box ${box.id} closed`
      }
      aria-pressed={box.isOpen}
    >
      {/* Front face (closed) */}
      <span
        className={[
          "absolute inset-0 flex flex-col items-center justify-center gap-0.5",
          "transition-opacity duration-300",
          box.isOpen ? "opacity-0 pointer-events-none" : "opacity-100",
        ].join(" ")}
      >
        <span className="text-gray-300 font-bold leading-none" style={{ fontSize: "clamp(6px, 1.5vw, 12px)" }}>
          {box.id}
        </span>
        <span className="text-gray-500" style={{ fontSize: "clamp(5px, 1vw, 9px)" }}>
          ?
        </span>
      </span>

      {/* Back face (open) */}
      <span
        className={[
          "absolute inset-0 flex flex-col items-center justify-center gap-0.5",
          "transition-opacity duration-300",
          box.isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <span className="text-gray-400 leading-none" style={{ fontSize: "clamp(5px, 1vw, 9px)" }}>
          #{box.id}
        </span>
        <span className="text-white font-bold leading-none" style={{ fontSize: "clamp(6px, 1.5vw, 13px)" }}>
          {box.value}
        </span>
      </span>
    </button>
  );
}
