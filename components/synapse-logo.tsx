"use client"

import { useEffect, useRef } from "react"

export function SynapseLogo({ size = 48 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || hasAnimated.current) return
    hasAnimated.current = true

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const r = size * 0.38

    const vertices: [number, number][] = []
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2
      vertices.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
    }

    // Build draw segments
    type Segment = { type: "line"; from: [number, number]; to: [number, number] }
    type DotSeg = { type: "dot"; pos: [number, number]; radius: number }
    type DrawItem = Segment | DotSeg

    const segments: DrawItem[] = []

    // Hexagon edges
    for (let i = 0; i < 6; i++) {
      segments.push({
        type: "line",
        from: vertices[i],
        to: vertices[(i + 1) % 6],
      })
    }

    // Three diagonals
    for (let i = 0; i < 3; i++) {
      segments.push({
        type: "line",
        from: vertices[i],
        to: vertices[i + 3],
      })
    }

    // Vertex dots
    for (const v of vertices) {
      segments.push({ type: "dot", pos: v, radius: size * 0.025 })
    }

    // Center dot
    segments.push({ type: "dot", pos: [cx, cy], radius: size * 0.04 })

    const totalDuration = 1600
    const perItem = totalDuration / segments.length
    let startTime: number | null = null

    function draw(timestamp: number) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime

      ctx!.clearRect(0, 0, size, size)
      ctx!.strokeStyle = "#222222"
      ctx!.lineWidth = 0.8
      ctx!.lineCap = "round"
      ctx!.lineJoin = "round"
      ctx!.fillStyle = "#222222"

      for (let i = 0; i < segments.length; i++) {
        const itemStart = i * perItem
        if (elapsed < itemStart) break

        const progress = Math.min((elapsed - itemStart) / perItem, 1)
        const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic

        const seg = segments[i]

        if (seg.type === "line") {
          const dx = seg.to[0] - seg.from[0]
          const dy = seg.to[1] - seg.from[1]
          ctx!.beginPath()
          ctx!.moveTo(seg.from[0], seg.from[1])
          ctx!.lineTo(seg.from[0] + dx * eased, seg.from[1] + dy * eased)
          ctx!.stroke()
        } else {
          ctx!.beginPath()
          ctx!.globalAlpha = eased
          ctx!.arc(seg.pos[0], seg.pos[1], seg.radius * eased, 0, Math.PI * 2)
          ctx!.fill()
          ctx!.globalAlpha = 1
        }
      }

      if (elapsed < totalDuration) {
        requestAnimationFrame(draw)
      }
    }

    // Delay logo drawing to sync with page fade-in
    const timer = setTimeout(() => {
      requestAnimationFrame(draw)
    }, 300)

    return () => clearTimeout(timer)
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
