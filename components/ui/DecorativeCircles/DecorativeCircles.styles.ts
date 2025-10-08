import styled from 'styled-components'

export const Circle = styled.div<{
  $size: number
  $left: number
  $top: number
  $color: string
  $opacity: number
}>`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  border-radius: 50%;
  background-color: ${props => props.$color};
  opacity: ${props => props.$opacity};
  left: ${props => props.$left}%;
  top: ${props => props.$top}%;
  pointer-events: none;
  z-index: 1;
`
