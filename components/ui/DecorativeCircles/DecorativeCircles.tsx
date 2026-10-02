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
      const right = (index * 17) % 40
      const bottom = (index * 13) % 20
      const color = index % 2 === 0 ? primaryColor : secondaryColor
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
