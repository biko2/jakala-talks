'use client'

import { useMemo } from 'react'
import { Circle } from './DecorativeCircles.styles'

interface DecorativeCirclesProps {
  count?: number
  primaryColor?: string
  secondaryColor?: string
}

export default function DecorativeCircles({
  count = 8,
  primaryColor = '#040066',
  secondaryColor = '#fa000a'
}: DecorativeCirclesProps) {
  const circles = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const size = 25
      const left = Math.random() * 80 + 10
      const top = Math.random() * 40 + 40
      const color = Math.random() > 0.5 ? primaryColor : secondaryColor
      const opacity = 1

      return {
        id: index,
        size,
        left,
        top,
        color,
        opacity
      }
    })
  }, [count, primaryColor, secondaryColor])

  return (
    <>
      {circles.map((circle) => (
        <Circle
          key={circle.id}
          $size={circle.size}
          $left={circle.left}
          $top={circle.top}
          $color={circle.color}
          $opacity={circle.opacity}
        />
      ))}
    </>
  )
}
