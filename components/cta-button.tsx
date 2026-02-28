"use client"

import { useState } from "react"

export function CtaButton() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type="button"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex h-32 w-32 cursor-pointer items-center justify-center border border-foreground/25 bg-background text-foreground transition-all duration-500 ease-out hover:border-foreground hover:bg-foreground hover:text-background hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground md:h-36 md:w-36"
      aria-label="Begin cognitive assessment"
    >
      <span className="flex flex-col items-center gap-3">
        <span className="font-mono text-[10px] font-normal uppercase leading-[1.6] tracking-[0.2em] text-center md:text-[11px]">
          BEGIN
          <br />
          ASSESSMENT
        </span>
        <span
          className={`block h-px bg-current transition-all duration-500 ease-out ${
            isHovered ? "w-8" : "w-4"
          }`}
        />
      </span>
    </button>
  )
}
