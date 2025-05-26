"use client"

import ReactConfetti from "react-confetti"
import { useEffect, useState } from "react"

interface ConfettiProps {
  active: boolean
}

export function Confetti({ active }: ConfettiProps) {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const { innerWidth: width, innerHeight: height } = window
    setDimensions({ width, height })

    const handleResize = () => {
      const { innerWidth: width, innerHeight: height } = window
      setDimensions({ width, height })
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (!active) return null

  return (
    <ReactConfetti
      width={dimensions.width}
      height={dimensions.height}
      recycle={false}
      numberOfPieces={500}
      tweenDuration={10000}
    />
  )
}
