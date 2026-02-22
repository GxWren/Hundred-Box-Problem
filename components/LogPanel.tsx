"use client";

import React, { useRef, useEffect } from "react";

interface LogPanelProps {
  log: string[];
}

export default function LogPanel({ log }: LogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg h-48 overflow-y-auto p-2 font-mono text-xs text-gray-300 flex flex-col gap-0.5">
      {log.length === 0 && (
        <span className="text-gray-600 italic">Events will appear here…</span>
      )}
      {log.map((entry, i) => {
        const isSuccess = entry.includes("SUCCEEDED") || entry.includes("FOUND");
        const isFailed = entry.includes("FAILED");
        return (
          <div
            key={i}
            className={
              isSuccess
                ? "text-green-400"
                : isFailed
                ? "text-red-400"
                : "text-gray-300"
            }
          >
            {entry}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
