"use client";

import React from "react";
import InteractiveManipulable from "./InteractiveManipulable";

interface SVGBlackboardProps {
  visual_spec: any;
}

export default function SVGBlackboard({ visual_spec }: SVGBlackboardProps) {
  // If no spec, show chalkboard with standby chalk animation
  if (!visual_spec) {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-black bg-[#1A2E26] p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-white min-h-[220px] flex flex-col items-center justify-center text-center">
        {/* Chalk dust subtle texture */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center mb-3 text-emerald-300 animate-pulse">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h4 className="font-handwriting text-xl text-emerald-200 tracking-wide font-bold">
          Dynamic Visual Blackboard
        </h4>
        <p className="font-casual text-xs text-emerald-100/70 max-w-sm mt-1">
          Interactive chalkboard sketches, state transitions, and step diagrams will be sketched live by Dr. Nova & Prof. Orion.
        </p>
      </div>
    );
  }

  const title = visual_spec.title || "Interactive Concept Visual";
  const type = visual_spec.type || "diagram";
  const nodes = visual_spec.nodes || visual_spec.elements || [];
  const caption = visual_spec.caption || visual_spec.summary || "";
  const formula = visual_spec.formula || visual_spec.math || "";
  const code = visual_spec.code || visual_spec.snippet || "";
  const steps = visual_spec.steps || [];
  const isManipulable = visual_spec.canvas_type === "interactive_manipulable" || type === "interactive_manipulable" || visual_spec.interactive === true;

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-black bg-[#162721] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-white">
      {/* Chalkboard Frame & Header */}
      <div className="flex items-center justify-between mb-4 border-b border-emerald-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h4 className="font-bold text-sm font-handwriting text-emerald-200 tracking-wide flex items-center gap-2">
            <span>✏️</span> {title}
          </h4>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/60 font-mono uppercase tracking-wider">
          {type.replace("_", " ")}
        </span>
      </div>

      {/* Chalkboard Content Area */}
      <div className="relative z-10 py-2">
        {/* Render Interactive Manipulables (e.g. Sliders, Regression lines, Activations) */}
        {isManipulable && <InteractiveManipulable spec={visual_spec} />}

        {/* Render Formula Blackboard */}
        {formula && (
          <div className="my-4 p-5 bg-black/30 border border-emerald-700/50 rounded-lg text-center font-mono text-lg md:text-xl text-emerald-100 tracking-widest shadow-inner">
            <span className="text-[#E75A3D] font-bold mr-2">ƒ(x) =</span>
            {formula}
          </div>
        )}

        {/* Render Code Blackboard */}
        {code && (
          <div className="my-3 p-4 bg-[#0e1a16] border border-emerald-800/70 rounded-lg font-mono text-xs text-emerald-300 overflow-x-auto shadow-inner whitespace-pre leading-relaxed">
            {code}
          </div>
        )}

        {/* Render Steps */}
        {steps.length > 0 && (
          <div className="space-y-2 my-3">
            {steps.map((st: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3 bg-black/20 p-2.5 rounded border border-emerald-800/40 font-casual text-xs text-emerald-100">
                <span className="w-5 h-5 rounded-full bg-emerald-800/80 text-emerald-200 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <span>{st}</span>
              </div>
            ))}
          </div>
        )}

        {/* Render Nodes / Flowchart */}
        {nodes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 relative">
            {nodes.map((node: any, idx: number) => (
              <div
                key={node.id || idx}
                className="bg-emerald-950/60 hover:bg-emerald-900/50 border-2 border-emerald-600/70 rounded-xl p-4 transition-all duration-300 transform hover:-translate-y-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] relative group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow border border-black/40 text-xs"
                    style={{ backgroundColor: node.color || "#E75A3D" }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-emerald-100 group-hover:text-emerald-300 transition-colors font-handwriting">
                      {node.label || node.title || `Node ${idx + 1}`}
                    </h5>
                    <p className="text-[10px] text-emerald-400/80 font-mono">
                      {node.id || `step_${idx + 1}`}
                    </p>
                  </div>
                </div>
                {idx < nodes.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <svg className="w-5 h-5 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Caption or Summary */}
        {caption && (
          <div className="mt-3 bg-black/40 border border-emerald-800/80 rounded-lg p-3 text-xs text-emerald-200/90 flex items-start gap-2 font-casual">
            <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{caption}</span>
          </div>
        )}
      </div>

      {/* Chalk Tray Bar */}
      <div className="mt-3 pt-2 border-t border-emerald-900/60 flex items-center justify-between text-[10px] text-emerald-400/60 font-mono">
        <span>N.O.V.A. Synchronized Vector Canvas</span>
        <span>Preset: High-Contrast Chalkboard</span>
      </div>
    </div>
  );
}
