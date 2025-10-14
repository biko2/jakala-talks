'use client'

import { useMemo } from 'react'
import { Circle } from './DecorativeCircles.styles'

interface DecorativeCirclesProps {
  count: number
  primaryColor?: string
  secondaryColor?: string
}

export default function DecorativeCircles({
  count,
  primaryColor = '#040066',
  secondaryColor = '#fa000a'
}: DecorativeCirclesProps) {
  const circles = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      if (index >= 20) {
        return {}
      }

      const size = 25
      let right: number, bottom: number

      right = Math.random() * 40
      bottom = Math.random() * 20

      const color = Math.random() > 0.5 ? primaryColor : secondaryColor
      const opacity = 1

      return {
        id: index,
        size,
        right,
        bottom,
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
          $right={circle.right}
          $bottom={circle.bottom}
        />
      ))}
    </>
  )
}
