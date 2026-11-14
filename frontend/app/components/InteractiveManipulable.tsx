"use client";

import React, { useState } from "react";

interface InteractiveManipulableProps {
  spec: {
    topic?: string;
    engine?: string;
    initial_state?: {
      points?: Array<{ x: number; y: number }>;
      slope?: number;
      intercept?: number;
      target_slope?: number;
      target_intercept?: number;
    };
    controls?: Array<{
      id: string;
      type: string;
      label: string;
      min: number;
      max: number;
      step: number;
      bind_to: string;
    }>;
    pedagogical_challenge?: {
      prompt: string;
      success_threshold?: {
        metric: string;
        operator: string;
        value: number;
      };
    };
  };
}

export default function InteractiveManipulable({ spec }: InteractiveManipulableProps) {
  const points = spec.initial_state?.points || [
    { x: 1, y: 2.1 },
    { x: 2, y: 2.9 },
    { x: 3, y: 3.8 },
    { x: 4, y: 4.7 },
    { x: 5, y: 5.4 },
  ];

  const [slope, setSlope] = useState<number>(spec.initial_state?.slope ?? 0.5);
  const [intercept, setIntercept] = useState<number>(spec.initial_state?.intercept ?? 1.0);

  // Compute Mean Squared Error (MSE) dynamically
  const mse = Number(
    (
      points.reduce((acc, pt) => {
        const yPred = slope * pt.x + intercept;
        return acc + Math.pow(pt.y - yPred, 2);
      }, 0) / points.length
    ).toFixed(3)
  );

  const isChallengeSuccess = mse <= 0.08;

  // ViewBox mapping (0 to 6 on x and y)
  const mapX = (xVal: number) => 30 + (xVal / 6) * 320;
  const mapY = (yVal: number) => 220 - (yVal / 7) * 200;

  const xStart = 0;
  const yStart = slope * xStart + intercept;
  const xEnd = 6;
  const yEnd = slope * xEnd + intercept;

  return (
    <div className="bg-[#0f1d18] border border-emerald-600/70 rounded-xl p-4 my-3 text-white shadow-inner">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-emerald-800/80 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h4 className="font-bold text-sm font-handwriting text-emerald-200">
            Interactive Manipulable: Linear Regression & Loss Residuals
          </h4>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-400">Mean Squared Error:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold border ${
              isChallengeSuccess
                ? "bg-emerald-900 border-emerald-400 text-emerald-200"
                : "bg-red-950/80 border-red-700 text-red-300"
            }`}
          >
            {mse}
          </span>
        </div>
      </div>

      {/* SVG Coordinate Sandbox */}
      <div className="relative my-3 bg-black/40 border border-emerald-900/60 rounded-lg p-2 flex justify-center">
        <svg viewBox="0 0 380 240" className="w-full max-w-md h-52 overflow-visible">
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map((g) => (
            <React.Fragment key={g}>
              <line
                x1={mapX(g)}
                y1={mapY(0)}
                x2={mapX(g)}
                y2={mapY(7)}
                stroke="rgba(16, 185, 129, 0.15)"
                strokeDasharray="2 2"
              />
              <line
                x1={mapX(0)}
                y1={mapY(g)}
                x2={mapX(6)}
                y2={mapY(g)}
                stroke="rgba(16, 185, 129, 0.15)"
                strokeDasharray="2 2"
              />
            </React.Fragment>
          ))}

          {/* Axes */}
          <line x1={mapX(0)} y1={mapY(0)} x2={mapX(6)} y2={mapY(0)} stroke="#34d399" strokeWidth="2" />
          <line x1={mapX(0)} y1={mapY(0)} x2={mapX(0)} y2={mapY(7)} stroke="#34d399" strokeWidth="2" />
          <text x={mapX(5.8)} y={mapY(0) + 15} fill="#34d399" fontSize="10" fontFamily="monospace">x</text>
          <text x={mapX(0) - 15} y={mapY(6.6)} fill="#34d399" fontSize="10" fontFamily="monospace">y</text>

          {/* Residual Error Lines */}
          {points.map((pt, i) => {
            const predY = slope * pt.x + intercept;
            return (
              <line
                key={`res-${i}`}
                x1={mapX(pt.x)}
                y1={mapY(pt.y)}
                x2={mapX(pt.x)}
                y2={mapY(predY)}
                stroke="#f87171"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Fitted Line */}
          <line
            x1={mapX(xStart)}
            y1={mapY(yStart)}
            x2={mapX(xEnd)}
            y2={mapY(yEnd)}
            stroke="#fbbf24"
            strokeWidth="2.5"
          />

          {/* Ground truth Data Points */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={mapX(pt.x)}
              cy={mapY(pt.y)}
              r="4.5"
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>

      {/* Interactive Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-950/40 p-3 rounded-lg border border-emerald-800/60 font-casual">
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-emerald-300 font-bold">Slope (m):</span>
            <span className="text-yellow-300 font-bold">{slope.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={-1.0}
            max={2.5}
            step={0.05}
            value={slope}
            onChange={(e) => setSlope(parseFloat(e.target.value))}
            className="w-full accent-yellow-400 bg-emerald-900 rounded-lg cursor-pointer h-1.5"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-emerald-300 font-bold">Intercept (c):</span>
            <span className="text-yellow-300 font-bold">{intercept.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={-2.0}
            max={4.0}
            step={0.1}
            value={intercept}
            onChange={(e) => setIntercept(parseFloat(e.target.value))}
            className="w-full accent-yellow-400 bg-emerald-900 rounded-lg cursor-pointer h-1.5"
          />
        </div>
      </div>

      {/* Pedagogical Goal Banner */}
      <div className="mt-3 p-3 bg-black/50 border border-emerald-700/50 rounded-lg text-xs flex items-start gap-2">
        <span className="text-base">🎯</span>
        <div className="space-y-1">
          <p className="text-emerald-100 font-medium">
            {spec.pedagogical_challenge?.prompt ||
              "Adjust the slope (m) and intercept (c) sliders above until the red residual lines shrink and MSE <= 0.08."}
          </p>
          {isChallengeSuccess && (
            <span className="inline-block text-[11px] font-bold text-emerald-300 font-mono bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-500 animate-bounce">
              ✓ Optimal Fit Discovered! Residual Variance Minimized.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
