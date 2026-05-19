"use client"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface FlyJob {
  imageUrl: string
  sourceRect: DOMRect
  onComplete: () => void
}

let triggerRef: ((job: FlyJob) => void) | null = null

export function flyToCart(job: FlyJob) {
  if (triggerRef) triggerRef(job)
  else job.onComplete()
}

export function FlyToCartHost() {
  const [job, setJob] = useState<FlyJob | null>(null)
  const [animating, setAnimating] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    triggerRef = (j) => setJob(j)
    return () => { triggerRef = null }
  }, [])

  useEffect(() => {
    if (!job) return
    // Find FAB target
    const fab = document.querySelector("[data-cart-fab]")
    const target = fab?.getBoundingClientRect()
    if (!target) {
      job.onComplete()
      setJob(null)
      return
    }
    // Trigger transform on next frame
    setAnimating(false)
    const raf = requestAnimationFrame(() => {
      setAnimating(true)
    })
    const timer = setTimeout(() => {
      job.onComplete()
      setJob(null)
      setAnimating(false)
    }, 400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [job])

  if (!mounted || !job) return null

  const fab = document.querySelector("[data-cart-fab]")
  const target = fab?.getBoundingClientRect()
  if (!target) return null

  const tx = target.left + target.width / 2 - (job.sourceRect.left + job.sourceRect.width / 2)
  const ty = target.top + target.height / 2 - (job.sourceRect.top + job.sourceRect.height / 2)

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: job.sourceRect.top,
        left: job.sourceRect.left,
        width: job.sourceRect.width,
        height: job.sourceRect.height,
        backgroundImage: `url(${job.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: 10,
        pointerEvents: "none",
        zIndex: 9999,
        transition: "transform 400ms cubic-bezier(.34,1.56,.64,1), opacity 400ms",
        transform: animating ? `translate(${tx}px, ${ty}px) scale(0.2)` : "translate(0, 0) scale(1)",
        opacity: animating ? 0 : 1,
      }}
    />,
    document.body
  )
}
