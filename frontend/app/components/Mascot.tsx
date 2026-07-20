"use client";

import React from "react";

interface MascotProps {
  className?: string;
}

export default function Mascot({ className = "" }: MascotProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Bobbing and floating container */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Shadow underneath */}
        <ellipse
          cx="50"
          cy="92"
          rx="24"
          ry="4"
          fill="rgba(0, 0, 0, 0.08)"
          className="animate-pulse"
          style={{ animationDuration: "3s" }}
        />

        {/* Mascot Body Group (bobs up and down) */}
        <g className="animate-float" style={{ animationDuration: "4s" }}>
          {/* Orange Left Arm */}
          <path
            d="M 22,65 Q 10,70 18,80 Q 22,82 26,75"
            fill="none"
            stroke="#EA580C"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Orange Right Arm */}
          <path
            d="M 78,65 Q 90,70 82,80 Q 78,82 74,75"
            fill="none"
            stroke="#EA580C"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Blue Circular Body */}
          <circle
            cx="50"
            cy="58"
            r="30"
            fill="#38BDF8"
            stroke="#1A1A1A"
            strokeWidth="2.5"
          />

          {/* Helmet Ear Covers / Flaps */}
          <path
            d="M 22,46 L 18,65 Q 16,72 20,72 L 23,60 Z"
            fill="#854D0E"
            stroke="#1A1A1A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M 78,46 L 82,65 Q 84,72 80,72 L 77,60 Z"
            fill="#854D0E"
            stroke="#1A1A1A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Leather Pilot Helmet Base */}
          <path
            d="M 20,46 C 20,22 80,22 80,46 C 80,48 78,50 74,48 C 65,44 35,44 26,48 C 22,50 20,48 20,46 Z"
            fill="#78350F"
            stroke="#1A1A1A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Helmet center badge */}
          <path
            d="M 46,28 L 50,24 L 54,28 L 50,32 Z"
            fill="#CA8A04"
            stroke="#1A1A1A"
            strokeWidth="1.5"
          />

          {/* Pilot Goggles Strap */}
          <rect
            x="20"
            y="38"
            width="60"
            height="4"
            fill="#1A1A1A"
          />

          {/* Pilot Goggles Frames & Lenses */}
          {/* Left Lens */}
          <circle
            cx="37"
            cy="42"
            r="9"
            fill="#E2E8F0"
            stroke="#1A1A1A"
            strokeWidth="2.5"
          />
          <circle
            cx="37"
            cy="42"
            r="7"
            fill="#F8FAFC"
          />
          {/* Right Lens */}
          <circle
            cx="63"
            cy="42"
            r="9"
            fill="#E2E8F0"
            stroke="#1A1A1A"
            strokeWidth="2.5"
          />
          <circle
            cx="63"
            cy="42"
            r="7"
            fill="#F8FAFC"
          />
          {/* Goggles Bridge */}
          <rect
            x="46"
            y="40"
            width="8"
            height="3"
            fill="#E2E8F0"
            stroke="#1A1A1A"
            strokeWidth="1.5"
          />

          {/* Goggles glare shine lines */}
          <path d="M 33,39 L 36,42" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 59,39 L 62,42" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />

          {/* Mascot Eyes */}
          <circle cx="38" cy="60" r="4.5" fill="#1A1A1A" />
          <circle cx="38" cy="58.5" r="1.5" fill="#FFFFFF" />
          
          <circle cx="62" cy="60" r="4.5" fill="#1A1A1A" />
          <circle cx="62" cy="58.5" r="1.5" fill="#FFFFFF" />

          {/* Happy Mouth */}
          <path
            d="M 44,68 Q 50,72 56,68"
            fill="none"
            stroke="#1A1A1A"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Propeller Mount Shaft */}
          <rect
            x="48"
            y="17"
            width="4"
            height="8"
            fill="#CA8A04"
            stroke="#1A1A1A"
            strokeWidth="2.5"
          />

          {/* ANIMATED PROPELLER */}
          <g className="origin-[50px_16px] animate-propeller-spin">
            {/* Center axle cap */}
            <circle
              cx="50"
              cy="16"
              r="3.5"
              fill="#CA8A04"
              stroke="#1A1A1A"
              strokeWidth="2"
            />
            {/* Propeller Blade 1 */}
            <path
              d="M 50,16 C 30,13 25,19 12,16 C 25,10 35,16 50,16 Z"
              fill="#FACC15"
              stroke="#1A1A1A"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Propeller Blade 2 */}
            <path
              d="M 50,16 C 70,13 75,19 88,16 C 75,10 65,16 50,16 Z"
              fill="#FACC15"
              stroke="#1A1A1A"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
